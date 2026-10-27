# 02 — Spesifikasi Supabase: PostgreSQL, RLS, Auth, Storage, Edge Functions

**Ini adalah kontrak implementasi SQL**, bukan skema yang sudah di-deploy. Agent harus menulis migration SQL yang executable, migrasi secara lokal, dan test negative/positive. Gunakan `uuid`, tipe data tepat, `created_at timestamptz DEFAULT now()`, foreign keys, CHECK/UNIQUE, `household_id` untuk isolasi, `updated_at`, trigger audit sebagai perlu. PENTING: tidak boleh menjadikan setiap `public.*` tabel terbuka secara default.

## Domain dan skema tabel minimal
1. `profiles`: `id uuid PK REFERENCES auth.users(id)`, `display_name`, `avatar_path`, `created_at`, `updated_at`. User boleh ubah profil sendiri. Baca profil member satu household hanya kolom yang aman via view/akses yang jelas (jangan expose email confidential ke tenant lain).
2. `households`: id, `name`, `timezone` (default `Asia/Jakarta`), `created_by` FK auth.users, timestamps. Owner/admin mengelola household.
3. `household_members`: id, household_id, user_id, `role` (`owner|admin|member`), `is_active`, joined_at; unique(household_id,user_id). Hanya member aktif boleh mengakses household.
4. `household_invitations`: id, household_id, email normalized, invited_role, token_hash **bukan raw token**, expires_at, consumed_at, invited_by. Tidak dapat dibaca member biasa. Penerimaan melalui Edge setelah identitas email cocok.
5. `cats`: id, household_id, name, sex nullable, breed/color/notes nullable, birth_date nullable, weight nullable tidak sebagai sumber histori, image_path nullable, archived_at nullable, timestamps. Semua record harus dibuat user asli.
6. `litter_boxes`: id, household_id, name, location, kind, size nullable, image_path nullable, archived_at nullable, timestamps.
7. `litter_box_cats`: `(litter_box_id, cat_id)` PK, jamin keduanya satu household di trigger/constraint DB; jangan izinkan relasi lintas household.
8. `catalog_items`: id, household_id, name, category (`food|litter|medicine|equipment|other`), brand nullable, unit, image_path, min_stock numeric nonnegative, current_stock numeric nonnegative **hanya berubah via RPC ledger**, description, archived_at. `catalog_item_movements`: id, item_id, household_id, quantity_delta, reason, actor_id, occurred_at; perubahan stok transaksional, unit konsisten. Pastikan UPDATE current_stock direct restricted terhadap client/member.
9. `cat_weight_entries`: id, household_id, cat_id, weight_kg > 0, measured_at, recorded_by; chart dari data ini saja.
10. `care_notes`: id, household_id, cat_id nullable, litter_box_id nullable, body, author_id, created_at; validate target set exactly one.
11. `schedule_templates`: id, household_id, name, activity_type (`feed|clean_litter`), feeding_slot (`pagi|siang|sore|malam`, nullable untuk clean), local_time TIME, days_of_week SMALLINT[] ISO 1..7, starts_on DATE, ends_on DATE NULL, target_mode (`all|selected`), catalog_item_id optional **sebagai referensi** (jangan otomatis potong stok tanpa konfirmasi consumption), `active`, created_by, created_at, updated_at. Validasi valid days/ranges/slot.
12. `schedule_template_targets`: id, template_id, `cat_id uuid NULL REFERENCES cats` atau `litter_box_id uuid NULL REFERENCES litter_boxes`, satu target tepat; hanya digunakan jika mode selected, DB enforce kind-target match dan household consistency.
13. `scheduled_tasks`: id, household_id, template_id, `local_date DATE`, `scheduled_at TIMESTAMPTZ`, activity_type, feeding_slot nullable, created_at; UNIQUE(template_id, local_date), snapshot nama/slot bila perlu untuk melindungi histori; jangan menyimpan status global yang bisa bohong terhadap target.
14. `scheduled_task_targets`: id, household_id, scheduled_task_id, cat_id nullable, litter_box_id nullable, status (`pending|completed|skipped`), completed_at nullable, completed_by nullable, notes nullable, updated_at; exactly one target, FK household coherence, UNIQUE task+target non-null (partial unique indexes). Tombol group menandai semua target hanya setelah explicit konfirmasi.
15. `activity_logs`: id, household_id, scheduled_task_target_id, actor_id, action (`completed|skipped|reopened`), happened_at, note nullable, created_at; **append-only** dan immutable bagi client. Mutasi status & append audit di DB transaction. Item editing salah jangan hapus audit.
16. `notification_preferences`: user_id + household_id unique, due_reminders, daily_summary, weekly_report, member_activity, updated_at. Jangan mengaku mengirim email/push kalau delivery belum dikonfigurasi. Bisa implement **in-app notifications** di tabel berikut.
17. `notifications`: id, household_id, user_id, type, title, body, seen_at, created_at. Akses hanya penerima. Scheduled notifications hanya dibuat dengan mekanisme background yang benar, atau gunakan reminder saat app terbuka dan jelaskan keterbatasannya.
18. `user_preferences`: user_id PK, theme (`light|dark|system`), locale (`id-ID`), font_scale; updated_at. Jika aplikasi hanya bahasa Indonesia, jangan tampilkan dropdown bahasa yang tidak punya implementasi.

## Semantik laporan tanpa inflasi
- **Kartu aktivitas** (schedule group) ≠ **jumlah tindakan per-target**. Pada satu hari: 4 slot makan + 1 slot kebersihan = 5 kartu/tugas grup. Bila ada 4 kucing + 2 litter box, target tindakan bisa 4×4 + 2 = 18 penyelesaian per hari. Dokumentasikan jenis agregasi pada setiap angka dan tooltip.
- `progress`: completed targets / semua targets terjadwal dalam periode, abaikan postponed/skipped sesuai definisi tertulis; `overdue` hanya target pending yang scheduled_at lewat now, banding UTC.
- `consistency`: persentase completed on-time atau completed overall? Pilih **completed/eligible targets** dengan definisi jelas; hindari bagi 0 (tampilkan `—` jika belum ada data).
- `streak`: jumlah hari berurutan terakhir dengan semua target due hari itu completed; jangan menghitung hari kosong sebagai sukses.
- Weight trend hanya dari weight entries, tidak boleh contoh grafik saat record kosong.
- Users list hanya household saat ini, bukan semua penguna Supabase.

## Edge Functions required (server-side TypeScript)
1. `generate-month-schedule`: signed-in admin/owner; Zod validation; input household ID, start-date, end-date, templates/rules; maximum 1 calendar month; preview dihitung di client tapi server revalidasi; jalankan Postgres transaction/RPC untuk insert tasks dan task targets atomik; UNIQUE membuat idempotent; return counts of new/existing/groups/targets. Hormati timezone rumah; mulai `23 Oct 2026` sampai `22 Nov 2026` = 31 hari contoh, jika template 5 maka 155 **group task**, jumlah target tergantung real cats/litter boxes.
2. `invite-member`: owner/admin mengundang email role admin/member; lakukan role authorization berbasis `household_members` + approved email, rate-limit/invitation expiry; jika email infrastructure tidak aktif berikan **secure invite link** yang dapat disalin admin, jangan menyatakan email terkirim.
3. `accept-invitation`: JWT signed-in user dengan email terverifikasi cocok invitation; token single-use; transaction adds membership, marks consumed, protects replay.
4. `manage-member`: admin/owner change role, deactivate/reactivate remove membership; **tidak bisa menurunkan/menghapus owner terakhir**; non-owner tidak boleh assign owner; no cross-household.
5. `export-activities`: signed-in member household yang berhak baca logs; server export CSV dengan date filters; batasi rentang dan size, paginate, escape CSV formula injection (`=`, `+`, `-`, `@`), jangan ekspor household lain.
6. `delete-account`: auth verified, explicit confirmation & optional fresh reauthentication; periksa apakah user last owner dan memerlukan transfer/household deletion; kalau belum diimplementasikan aman, blokir dengan penjelasan daripada tombol palsu. Gunakan admin API hanya Edge dengan secret server-only.

## RLS & privilege matrix
| Resource | Member aktif | Admin aktif | Owner |
|--|--|--|--|
| profiles | self, limited shared view | self + shared view | self + shared view |
| cats/litter/catalog | read + record care actions; edit sesuai kebijakan eksplisit | full CRUD | full CRUD |
| schedules/templates | read scheduled | create/edit future | create/edit future |
| task targets | complete/skip own household via authenticated RPC | same | same |
| activity_logs | read own household, insert via RPC only | read/export | read/export |
| reports | read own household | read/export | read/export |
| memberships/invites | read membership summary saja | invite/change member (bukan owner) | invite/change/transfer |
| household settings | read | edit | edit |
| own preferences/profile | read/write own | read/write own | read/write own |

Kunci perlu dibuat SQL RLS dan grants (bukan hanya matrix). Policy recursion untuk `household_members` harus diatasi dengan helper/function aman atau desain yang tidak self-reference. Helper membership boleh `security definer set search_path = ''` dengan pemeriksaan identitas `auth.uid()` dan fungsi hanya mengembalikan boolean akses; set `REVOKE/GRANT EXECUTE` eksplisit. Jangan broad SECURITY DEFINER yang mengembalikan seluruh tabel.

## Storage
- Buckets private `cat-images`, `litter-images`, `catalog-images`, `profile-avatars`.
- Key prefix household scoping `${household_id}/${entity_id}/${randomName}` dengan safe content type/size.
- Storage RLS policies for SELECT/INSERT/UPDATE/DELETE based on authenticated user and household membership; profile avatars only self. Signed URL expiring or `download` auth; jangan public bucket kecuali desain khusus disetujui.
- Jangan menerima path arbitrary yang mengakses tenant lain; hapus object lama saat penggantian melalui mekanisme tersupervisi.

## Testing keamanan dan data
- 2 akun household A dan B: token B SELECT/UPDATE/DELETE row A harus empty/403 sesuai policy; function dengan household A dari user B = 403.
- Member biasa direct invoke `generate-month-schedule`, `invite-member`, `manage-member` = 403; RLS tidak mengizinkan insert template.
- Unauthenticated users jangan bisa baca protected data, settings, storage file.
- Invited user email mismatch/reused/expired = denied.
- Double-click mark-complete tidak menciptakan duplicate logs; race update 2 devices safe.
- Schedule generate twice: 2nd run new=0, duplicate=0; stable history; DST/timezone validation.
- Stock cannot become negative; membership changes do not leak TanStack Query cache.

## RLS SQL reference pattern (adaptasi lengkap ke schema riil)
```sql
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
CREATE POLICY cats_member_read ON public.cats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members AS hm
    WHERE hm.household_id = cats.household_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.is_active = true
  )
);
```
Ini **hanya contoh pola**; `household_members` juga memerlukan kebijakan non-rekursif yang aman. Implementasikan full policy matrix (SELECT/INSERT/UPDATE/DELETE), indexes, tests dan gunakan `WITH CHECK` pada INSERT/UPDATE. Pertimbangkan schema/helper membership yang optimized. Jangan menganggap SQL contoh ini sebagai migrasi lengkap.

## Supabase authentication aktual
- Register/login/logout/password reset; signup confirmation email boleh enabled sesuai project.
- Jika membangun app localhost dengan Supabase cloud, whitelist redirect `http://localhost:5173/auth/callback` di Auth URL Configuration (atau callback route yang benar).
- First signed-in user dapat membuat household via authenticated atomic RPC/Edge yang mengisi `households + household_members owner`. Jangan membuat admin global hardcoded.
- Supabase Auth service role hanya di server saat benar-benar butuh tindakan admin; never in Vite bundle.
