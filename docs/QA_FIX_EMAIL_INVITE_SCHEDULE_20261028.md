# QA Fix — Email, Invite, dan Jadwal Besok

Tanggal audit lanjutan: 2026-10-29 (Asia/Jakarta)

## Audit dan perubahan

- `src/features/auth/AuthPage.tsx`: normalisasi email, redirect konfirmasi ke origin lokal, pesan email belum terkonfirmasi, dan resend confirmation.
- `src/features/members/MembersPage.tsx`: error Edge Function dibaca dari response JSON dan tidak melaporkan sukses tanpa `email_sent: true`.
- `supabase/functions/invite-household-member/index.ts`: dukung secret server-role Supabase, validasi response invitation, dan redirect memakai origin request yang sudah di-allowlist.
- `supabase/config.toml`: email confirmation lokal aktif serta template confirmation/invite.
- `supabase/templates/invite.html`: template undangan lokal.
- `supabase/migrations/20261028000300_repair_future_schedule_occurrences.sql`: generator occurrence idempoten untuk range besok; row completed, archived, dan tanggal lampau tidak ditimpa.
- `src/features/schedules/useSchedules.ts`: generation dijalankan juga untuk filter Tomorrow dan cache menyertakan tanggal lokal agar perpindahan hari tidak memakai hasil lama.
- `src/features/schedule-history/ScheduleHistoryPage.tsx`: fallback preview memakai timezone jadwal dari database.
- `src/features/schedules/SchedulesPage.tsx` dan `src/features/schedule-history/ScheduleHistoryPage.tsx`: filter checklist langsung `Besok`.
- `src/features/members/MembersPage.tsx`: undangan pending dapat dibatalkan dengan konfirmasi; pembatalan memakai RPC berotorisasi dan tidak menghapus audit.
- `supabase/migrations/20261029000100_cancel_household_invitations.sql`: deduplikasi pending lama secara aman dengan status `revoked`, unique index untuk pending baru, RPC cancel, dan audit event.
- `supabase/functions/invite-household-member/index.ts`: menolak undangan pending duplikat sebelum membuat record atau mengirim email baru.
- `src/features/schedules/SchedulesPage.tsx`: frekuensi dilokalkan, warning bulanan multi-hari ditampilkan, dan tersedia aksi eksplisit `Jadikan harian` agar rentang 28 Oktober–28 November benar-benar menghasilkan checklist setiap tanggal.
- `supabase/migrations/20261029000200_normalize_month_range_schedules.sql`: rentang finite sampai satu bulan yang tersimpan keliru sebagai `1 month` otomatis dinormalisasi menjadi `1 day`, termasuk record lama dan penulisan baru.
- `supabase/migrations/20261029000300_explicit_household_invitation_acceptance.sql`: mematikan auto-join saat signup dan menambahkan RPC email-bound untuk melihat, menerima, atau menolak undangan dengan audit event.
- `src/features/invitations/InvitationPage.tsx` dan `src/features/invitations/useInvitation.ts`: landing invitation-first yang menampilkan household pengundang, accept/decline, dan mencegah onboarding rumah baru saat ada undangan.
- `src/App.tsx`: fallback konteks undangan dari `session.user.user_metadata.invitation_id` saat redirect production lama kehilangan query `?invitation=`; fallback hanya dipakai setelah query household aktif selesai dan user belum memiliki household, sehingga acceptance tetap masuk ke household pengundang dan tidak membuka onboarding rumah baru.
- `src/features/invitations/InvitationPage.tsx`: status undangan `revoked`/`accepted` sekarang otomatis membersihkan query invitation dan kembali ke app session aktif; household id hanya diteruskan untuk status accepted lalu tetap diverifikasi terhadap membership aktif oleh `App`.
- `src/App.tsx`: mencegah redirect loop setelah invitation selesai dengan membatasi fallback metadata ke path entry undangan `/app/pengguna`; halaman dashboard `/app` tidak lagi membuka ulang invitation yang sama dari metadata session lama.
- `src/features/invitations/InvitationPage.tsx`: invitation yang sudah expired, revoked, cancelled, tidak ditemukan, atau sudah diproses otomatis dibersihkan dan diarahkan ke `/app`; error teknis yang bukan stale invitation tetap ditampilkan agar tidak disamarkan.
- `src/features/auth/AuthPage.tsx`: memetakan `Invalid login credentials` menjadi pesan yang menjelaskan perbedaan `auth.users` vs profil, mengingatkan bahwa login memakai email, dan memberi jalur link undangan/reset password untuk akun hasil invitation tanpa membypass verifikasi Supabase.
- `supabase/migrations/20261029000400_auth_user_deletion_cleanup.sql`: trigger `auth_user_deletion_cleanup` memindahkan foreign-key creator/actor ke owner household, mempertahankan audit dan data bisnis, membersihkan assignment/completion link nullable, serta memblokir penghapusan owner household.
- `supabase/functions/admin-user-directory/index.ts`: error delete user sekarang membedakan owner protection dan database yang belum menerapkan migration cleanup.
- `src/App.tsx` dan `src/features/auth/AuthPage.tsx`: invitation context diprioritaskan sebelum onboarding dan dipertahankan melewati auth redirect.
- `supabase/functions/household-invitation/index.ts` dan `src/features/invitations/useInvitation.ts`: fallback server-side untuk production yang belum memiliki RPC invitation di schema cache; fallback tetap memverifikasi JWT dan email penerima sebelum get/accept/decline.
- `src/management.css` dan `src/responsive-polish.css`: invitation card, error text, form controls, dan modal dibuat wrap-safe untuk viewport kecil 320px–430px.
- `supabase/functions/invite-household-member/index.ts`: bila Auth menolak email karena akun sudah terdaftar, record undangan baru langsung diubah menjadi `revoked` sehingga tidak tertinggal sebagai pending; UI me-refresh daftar pending setelah error.
- `supabase/functions/admin-user-directory/index.ts`: menu database pengguna untuk owner/admin; daftar dibatasi ke anggota household aktif, penghapusan Auth memerlukan konfirmasi email, melindungi owner/self, dan menolak akun yang masih aktif di household lain.
- `src/features/admin-users/AdminUsersPage.tsx`, `src/routes.tsx`, dan `src/components/AppShell.tsx`: menu `Database pengguna` hanya muncul untuk owner/admin dan memakai Edge Function server-side.
- `supabase/templates/invite.html` dan `supabase/templates/confirm-email.html`: mengganti inline SVG yang tidak konsisten dirender Gmail menjadi PNG logo publik (`https://meowku.panda-12b.workers.dev/UI/Meowku_Logo_Kucing_Jam_Transparent.png`) dengan atribut alt dan ukuran eksplisit.
- `tests/ui/email-templates.test.mjs`: memastikan kedua template memakai asset PNG publik, memiliki alt text, dan tidak kembali ke inline SVG.

## Perintah yang dijalankan

- `npm test` — PASS, 159 test.
- `npm run typecheck` — PASS.
- `npm run build` — PASS, Vite production build selesai.
- `git diff --check` — PASS.
- `npm test` — PASS, 161 test setelah audit undangan pending dan normalisasi rentang jadwal.
- `npm test` — PASS, 162 test.
- `npm run typecheck` — PASS.
- `npm run build` — PASS.
- `git diff --check` — PASS (peringatan yang tersisa hanya normalisasi line ending CRLF dari Git).
- `npm test` — PASS, 163 test setelah penambahan database pengguna admin.
- `npm run typecheck` — PASS.
- `npm run build` — PASS, chunk `AdminUsersPage` berhasil dibuat.
- Visual QA localhost `/` di viewport mobile — PASS, halaman auth dan form signup tampil.

## Runtime QA

 - `supabase start` — BLOCKED pada mesin saat audit lanjutan: path template sudah benar (`./supabase/templates/...`), tetapi Docker Desktop tidak aktif/pipe `dockerDesktopLinuxEngine` tidak tersedia. CLI juga melaporkan profile lokal belum ada. Ini blocker runtime lokal, bukan compile aplikasi.
   - API/Edge Functions `http://127.0.0.1:54331`
   - Database `54332`
   - Studio `54333`
   - Mailpit `http://127.0.0.1:54334`
- Supabase runtime lokal — BLOCKED; Docker Desktop/pipe `dockerDesktopLinuxEngine` tidak tersedia, sehingga Edge Function dan alur email belum diuji end-to-end pada sesi ini.
- Migrasi dan Edge Function — belum diverifikasi atau dideploy ke production pada sesi ini.

Tidak ada `db reset --linked`, deploy internet, atau mutasi project remote yang dilakukan.

Untuk melanjutkan verifikasi runtime di localhost:

```bash
supabase start
supabase functions serve invite-household-member
npm run dev
```

Buka `http://127.0.0.1:54334` untuk memeriksa email confirmation dan invite. `.env.development.local` dipakai hanya untuk Vite development lokal; `.env` hosted tetap dipakai build production.

Status akhir: PASS untuk audit kode, test, typecheck, dan production build. Runtime Supabase lokal BLOCKED oleh Docker Desktop/profile CLI. Migration `20261029000300` dan migration sebelumnya belum diverifikasi di production; frontend dan Edge Function juga belum dideploy dari sesi ini sesuai instruksi repository yang melarang deploy internet otomatis.

Untuk mengaktifkan menu database pengguna di production, deploy function baru bersama function undangan:

```powershell
supabase functions deploy admin-user-directory --project-ref umwufyldlrqqsowpisdq --use-api
supabase functions deploy invite-household-member --project-ref umwufyldlrqqsowpisdq --use-api
supabase functions deploy household-invitation --project-ref umwufyldlrqqsowpisdq --use-api
```

Error `get_household_invitation(...) in the schema cache` berarti migration `20261029000300_explicit_household_invitation_acceptance.sql` belum masuk ke database production. Jalankan `supabase db push --linked --yes` (tanpa `--project-ref` pada subcommand `db push`) agar RPC utama tersedia; fallback Edge Function menjaga alur tetap dapat digunakan setelah function tersebut dideploy.

## Visual QA undangan mobile — 2026-10-29

- Bug: teks tombol `Terima undangan` terpotong karena aturan global `height: 48px` tetap menang saat label membungkus.
- Fix: `InvitationPage.tsx` memakai state layout konsisten; `management.css` menghapus tinggi paksa khusus aksi undangan, membungkus error panjang, memberi safe-area padding, dan men-stack tombol pada viewport <=520px.
- Validasi: `npm test` PASS, 164 test; `npm run typecheck` PASS; `npm run build` PASS.
- Visual check: preview localhost berhasil dibuka; alur undangan terautentikasi penuh belum dapat diuji tanpa sesi akun lokal/Supabase runtime. Production belum dianggap PASS sampai frontend dan Edge Function dideploy.

## Email logo compatibility — 2026-10-29

- Bug: email invitation di Gmail menampilkan header tanpa logo karena template invite production tidak memiliki logo; inline SVG juga tidak aman untuk semua email client.
- Fix: kedua template auth memakai `<img>` PNG dari asset publik app melalui URL HTTPS absolut. Asset tersedia di `public/UI/Meowku_Logo_Kucing_Jam_Transparent.png` dan akan ikut ke `dist/UI/` saat build.
- Validasi: `npm run test -- --test-name-pattern='Gmail-compatible public logo asset'` PASS; 166 test terdeteksi PASS; `npm run typecheck` PASS; `npm run build` PASS; `git diff --check` PASS dengan peringatan line-ending lama yang tidak terkait.
- Status production: BLOCKED sampai template ini ditempel/disimpan di Supabase Dashboard atau konfigurasi email production diperbarui. Tidak ada deploy internet atau mutasi project remote dilakukan sesuai AGENTS.md.

## Database dan routing household — 2026-10-29

- Menu admin diganti menjadi `Database` dengan tab `Pengguna` dan `Household`.
- `admin-user-directory` sekarang menyediakan daftar household yang dapat diadministrasikan dan penghapusan household dengan konfirmasi nama. Owner pembuat household boleh menghapus household miliknya; global profile admin juga dapat mengelola household melalui otorisasi database, bukan ID arbitrary dari client.
- Penghapusan household memakai foreign-key cascade yang sudah ada pada domain household; UI memberi peringatan bahwa anggota, kucing, jadwal, histori, dan undangan ikut terhapus.
- Invitation acceptance meneruskan ID household hasil RPC/Edge Function ke redirect query yang diverifikasi terhadap daftar membership aktif, sehingga household pengundang dipilih setelah accept dan onboarding tidak mengambil alih.
- Validasi: `npm test` PASS, 164 test; `npm run typecheck` PASS; `npm run build` PASS.
- Runtime Supabase lokal dan production tetap belum dianggap PASS sampai Edge Function/frontend benar-benar dideploy dan diuji dengan akun nyata.

## Auth user deletion audit — 2026-10-29

- Bug: `auth.admin.deleteUser` dapat gagal dengan `Database error deleting user` karena foreign key `created_by`, `actor_id`, `invited_by`, dan assignment rotation masih menunjuk ke `auth.users`.
- Fix: migration `20261029000400_auth_user_deletion_cleanup.sql` memasang trigger sebelum delete untuk mempertahankan data household/audit, memindahkan creator/actor ke owner household, membersihkan assignment nullable, dan memblokir owner household.
- Validasi: `npm test` PASS, 166 test; `npm run typecheck` PASS; `npm run build` PASS; admin security assertions PASS.
- Status production: BLOCKED sampai migration dan `admin-user-directory` Edge Function dirilis ke project Supabase. Tidak ada remote mutation/deploy dilakukan dari sesi ini.

## Admin navigation access — 2026-10-29

- Bug: sidebar hanya menyembunyikan Database; member masih dapat membuka Laporan, Pengaturan Jadwal, Pengguna, atau Pengaturan melalui URL langsung.
- Fix: `AppShell` sekarang menampilkan seluruh menu admin hanya untuk role household `owner`/`admin`; `AdminOnlyRoute` mengarahkan member kembali ke dashboard untuk akses langsung.
- Database hardening: migration `20261029000500_admin_navigation_access.sql` membatasi pembacaan rotasi/petugas, mengamankan dua signature laporan, dan membatasi export household ke owner/admin.
- Validasi: `npm test` PASS, 166 test; `npm run typecheck` PASS; `npm run build` PASS; security/navigation assertions PASS.
- Status production: BLOCKED sampai migration ini diterapkan dan frontend terbaru dirilis. Tidak ada remote mutation/deploy dilakukan sesuai AGENTS.md.
