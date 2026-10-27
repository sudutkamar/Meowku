# Prompt Implementasi Menu — Kucing

**File referensi wajib:** `REFERENSI_DESAIN/UI/04_Kucing.png`. **Route:** `/app/kucing`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Kucing`, tombol `Tambah Kucing`, horizontal profile cards cat (foto/nama/umur dan ringkasan dari DB) + tile tambah. Content detail kucing terpilih dengan portrait besar, profil ringkas di sisi kiri, tab `Ringkasan`, `Jadwal`, `Riwayat Makan`, `Berat Badan`, `Catatan`, `Galeri`; konten utama chart Berat Badan, Jadwal Hari Ini, Ringkasan Aktivitas 7 hari, Catatan Kesehatan mengikuti referensi. Gunakan monogram/ikon jika foto belum ada, bukan foto Nala contoh.

## Behavior
- CRUD cat (name required, date/breed/sex optional, image upload), field validated; role admin edit/archive dan user yang diizinkan menambah care notes/weights sesuai policy.
- Selector cat via router search param typed; selected id tidak boleh dibaca jika bukan household; fallback ke cat pertama dari query (bukan fake cat).
- Umur dari birthdate jika ada; jika tidak tampil `Usia belum diisi`, jangan beri umur rekayasa.
- Weight chart mengambil `cat_weight_entries` ordered measured_at, handles 1 data point, no data -> CTA catat berat. Form catat berat >0 dan time actual.
- Cat health notes adalah teks yang dimasukkan user, tidak mengklaim status medis dari ketiadaan data; badge `Sehat` hanya bila ada state/penilaian user yang eksplisit disimpan, jika belum tampil `Belum dinilai`.
- Jadwal per-cat via join scheduled_task_targets; care history per-cat via logs; foto galeri dari Storage real; edit dan archive soft-delete dengan confirmation serta efek pada future schedules dijelaskan.

## Data dan tests
Multi cats filtering, notes and weight actual, upload replace/delete auth, no fabricated photos, archived cat historical reference preserved, chart never fake.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
