# Fix: Jadwal menampilkan orang yang salah (B padahal seharusnya A)

## Akar masalah
Assignee (petugas) dibekukan ke `schedule_occurrences.assigned_to/assignee_id`
saat `generate_schedule_occurrences` berjalan pertama kali. Setelah itu:

1. `generate_schedule_occurrences` — `ON CONFLICT ... DO UPDATE` hanya
   menyetel `scheduled_at`, **tidak** `assigned_to`/`assignee_id`.
2. `save_household_schedule_rotation` — hanya menambal occurrence yang
   `assignee_id IS NULL AND assigned_to IS NULL`.

Akibatnya snapshot lama (mis. B dari rotasi lama / generated sebelumnya)
tidak pernah dikoreksi meski rotasi sudah diubah. Completion kemarin
(B) tidak menggeser apa pun — yang menentukan adalah pemetaan weekday
rotasi (`extract(isodow from local_date)`).

## Fix final
1. **Migrasi `20261105000100_dynamic_rotation_assignee.sql`**: RPC dynamic `household_schedule_occurrences` untuk sumber kebenaran UI.
2. **Migrasi `20261106000100_today_completed_rotasi_assignee.sql`**: "Petugas" hari ini+masa depan (termasuk baris yang sudah `completed` hari ini) ikut rotasi aktif; history masa lalu & archived immutable.
3. **Migrasi `20261106000200_adhoc_reassign_uncomplete.sql`**: `manual_assignee_id` / `manual_assigned_by`; `reassign_occurrence` & `uncomplete_occurrence` + audit event untuk swap darurat & urungkan selesai.
4. **Migrasi `20261106000300_schedule_target_integrity.sql`**: trigger validasi target kucing/litter lintas household + auto-archive target/future occurrence saat entity diarsipkan.
5. **Client**: `useSchedules.ts` baca via RPC dynamic (no client recurrence fallback), tombol "Perbaiki penugasan hari ini" (owner/admin) dan dropdown "Ganti petugas" + "Urungkan selesai".
6. **Service Worker v4**: cache hanya static assets; tidak cache API Supabase.

## Verifikasi
- `npm run typecheck` ✅ PASS
- `npm run lint` ✅ PASS
- `npm run test` ✅ PASS — 185 tests
- `npm run build` ✅ PASS
- `npx wrangler deploy` ✅ deployed → https://meowku.panda-12b.workers.dev
- DB migrations pushed ✅

## Query verifikasi di Supabase
```sql
-- Selesaikan stale rows (owner/admin via RPC):
select public.repair_future_occurrence_assignments('<household_id>');

-- Cek petugas effective hari ini:
select local_date, household_assignees->>'display_name' as petugas
from jsonb_to_recordset(
  public.household_schedule_occurrences('<household_id>', current_date, current_date)
) as x(local_date date, household_assignees jsonb);
```
