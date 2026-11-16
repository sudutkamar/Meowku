# Backup Runbook — Supabase Lokal Meowku

Dokumen operasional untuk backup dan restore database Supabase lokal. Database lokal berjalan di port **54332** (lihat `supabase/config.toml`, `db.port`). Data bisnis hanya di Supabase PostgreSQL; tidak ada state domain di mock/localStorage, jadi backup pg_dump adalah satu-satunya sumber pemulihan lokal.

## 1. Backup harian (pg_dump)

Ambil kredensial dari `supabase/config.toml` (`db.port = 54332`, password default `postgres` untuk stack lokal Supabase CLI).

```powershell
# dari root repo
supabase start  # jika belum berjalan

$env:PGPASSWORD = "postgres"
& "supabase\postgres.exe" --version 2>$null  # pg_dump via CLI; atau gunakan psql tooling lokal

# Contoh umum (pg_dump versi ≥ server):
pg_dump --host localhost --port 54332 --username postgres --dbname postgres `
  --format=custom --no-owner --no-privileges `
  --file "backups\meowku-local-$(Get-Date -Format yyyyMMdd-HHmmss).dump"
```

Alternatif tanpa pg_dump di PATH: `supabase db dump --local --file backups/meowku-local-<tanggal>.sql` (dump skema + data SQL).

## 2. Simpanan

- Simpan dump di folder `backups/` yang **tidak di-track git** (tambahkan `backups/` ke `.gitignore` jika belum).
- Retensi yang disarankan: **7 dump harian + 4 dump mingguan**. Hapus dump terluar saat menambah yang baru (skrip rotasi sederhana cukup; tidak wajib otomatis).
- Jangan pernah commit dump berisi data pengguna ke repo.

## 3. Restore drill (dilakukan berkala, mis. bulanan)

Drill menjamin dump benar-benar bisa dipakai, bukan sekadar ada.

1. Buat database kosong untuk drill:
   ```powershell
   psql --host localhost --port 54332 --username postgres --command "CREATE DATABASE postgres_restore_drill;"
   ```
2. Restore dump ke database drill:
   ```powershell
   pg_restore --host localhost --port 54332 --username postgres `
     --dbname postgres_restore_drill --no-owner --no-privileges backups\meowku-local-<tanggal>.dump
   ```
3. Verifikasi:
   - `supabase db reset` TIDAK dipakai untuk drill ini (lihat catatan di bawah).
   - Jalankan query sanity: jumlah tabel app, jumlah baris `cats`, `schedules`, `schedule_occurrences`, `audit_events` cocok dengan dump.
   - Jalankan `npm run test:local` (opsional, jika bisa diarahkan ke port drill) atau minimal query RLS smoke.
4. Setelah PASS, hapus database drill:
   ```powershell
   psql --host localhost --port 54332 --username postgres --command "DROP DATABASE postgres_restore_drill;"
   ```

## 4. Paritas migrasi — aturan keras

- Push migrasi ke remote **hanya** dengan `supabase db push --linked` setelah migrasi teruji lokal.
- **Jangan pernah** `supabase db reset --linked` atau operasi destruktif lain terhadap project remote (AGENTS.md rule 11).
- Remote migrasi yang sudah tercatat tidak boleh diubah; migrasi baru diberi timestamp baru.
- Backup lokal tidak menggantikan migrasi: struktur skema selalu dari `supabase/migrations`, dump hanya data + snapshot skema lokal.
