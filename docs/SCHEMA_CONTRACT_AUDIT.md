# Schema Contract Audit

Tanggal: 24 Oktober 2026 (Asia/Jakarta)

## Temuan

- `public.schedules`, `schedule_targets`, `schedule_occurrences`, dan `audit_events` sebelumnya didefinisikan atau ditegakkan ulang di beberapa migration (`005`, `007`, `008`). Kontrak runtime sekarang dikunci oleh `20261024001100_schedule_contract_hardening.sql` dengan constraint/index/policy yang guarded.
- Client sebelumnya memakai `SupabaseClient` tanpa generic `Database`; hasil query dan payload mutation kemudian dipaksa dengan cast lokal.
- Pembuatan jadwal sebelumnya melakukan insert langsung dan menerima `owner_id` dari client-side flow. Sekarang RPC `create_schedule` mengambil `auth.uid()` di database.
- Penyelesaian occurrence sebelumnya dapat menulis ulang occurrence selesai dan membuat audit duplikat. RPC baru mengunci row, mengembalikan occurrence yang sudah selesai tanpa audit baru, dan hanya menulis audit pada transisi pertama.

## Perubahan

- `src/lib/database.types.ts` mendefinisikan Rows, Insert, Update, dan RPC Args/Returns untuk tabel bisnis.
- `src/lib/supabase.ts` membuat typed Supabase client.
- `useCats`, `useLitterBoxes`, dan `useCatalog` memakai DTO payload eksplisit.
- `useSchedules` memakai `create_schedule` RPC dengan payload eksplisit.
- `20261024001100_schedule_contract_hardening.sql` menambahkan contract hardening dan replay-safe RPCs.
- `tests/domain/database-contract.test.mjs` menegakkan kontrak typed client, DTO, dan idempotensi.

## Verifikasi

- `npm test`: PASS, 37/37.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; Vite hanya melaporkan warning chunk JavaScript >500 kB.
- `supabase status`: BLOCKED, Docker Desktop engine tidak tersedia.
- `supabase db push --linked`: NOT RUN; checkout tidak memiliki `supabase/config.toml` atau linked project metadata, sehingga target remote tidak dapat diverifikasi dengan aman.
- Visual screenshot QA: NOT RUN; batch ini hanya mengubah contract/data layer.
