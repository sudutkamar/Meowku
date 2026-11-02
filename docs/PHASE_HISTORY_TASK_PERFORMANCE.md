# Fase: Histori detail dan kinerja tugas

Tanggal: 2026-11-02

## Hasil

Histori sekarang memiliki dua tampilan:

- `Audit perubahan`: histori append-only untuk perubahan data, actor, role, undangan, stok, litter box, dan penyelesaian tugas.
- `Kinerja tugas`: rekap berdasarkan `schedule_occurrences`, sehingga status `terlewat` dan `belum jatuh tempo` tidak dibuat sebagai data palsu.

Rekap kinerja mencakup petugas, penyelesai, target kucing/litter box, status, keterlambatan, catatan, filter tanggal/anggota/status/kategori, ringkasan per anggota, dan daftar tugas terlewat.

## File dibuat

- `src/features/history/TaskPerformancePanel.tsx`
- `src/history-performance.css`
- `supabase/migrations/20261102000100_history_task_performance.sql`
- `tests/domain/history-performance.test.mjs`

## File diubah

- `src/features/history/HistoryPage.tsx`
- `src/features/schedules/useSchedules.ts`
- `src/lib/database.types.ts`
- `src/main.tsx`

## Keamanan dan integritas data

- Audit tetap immutable; migration tidak mengubah baris audit lama.
- `actor_name` disnapshot saat event baru dibuat agar nama actor tetap tersedia setelah akun dicabut.
- Metadata audit baru menyimpan label entitas dan perubahan field yang aman untuk ditampilkan, bukan seluruh row mentah.
- RPC `household_task_performance` hanya dapat dipakai owner/admin dan memakai `household_role()` dari database.
- Status tugas dihitung dari occurrence yang ada; tidak ada insert audit event `missed` atau mock metrics.
- Query tetap menggunakan timezone household untuk menentukan tugas yang sudah terlewat.

## Verifikasi

- `npm test` — PASS, 176 test lulus.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS, contract lint 74 file source.
- `npm run build` — PASS, Vite production build selesai.
- `git diff --check` — PASS.
- Preview `http://127.0.0.1:5173/` — PASS, halaman Auth tampil dan browser console tidak memiliki error/warning.

## Batas verifikasi

- `supabase db lint --local` — BLOCKED karena Docker daemon tidak aktif pada mesin ini.
- Visual QA authenticated untuk tab `Kinerja tugas` — BLOCKED karena Supabase lokal/Auth session tidak tersedia. Tidak dibuat data contoh untuk memaksa preview.

## Bug yang ditemukan dan diperbaiki

Percobaan `supabase db push` berhenti pada migration `20261102000100` karena fungsi `audit_care_display_name()` memakai `nullif()` dengan satu argumen. Sintaksnya sudah diperbaiki menjadi `nullif(..., '')`. Migration sebelumnya pada output CLI (`20261030000100` dan `20261030000200`) sudah diproses sebelum error; migration histori perlu dijalankan ulang setelah perbaikan.

Setelah Docker aktif, jalankan dari root project:

```bash
supabase start
supabase db lint --local
supabase migration up --local
npm run dev:local
```

Status fase: `IMPLEMENTED / SOURCE CHECKS PASS / LIVE DATABASE VERIFICATION BLOCKED`.
