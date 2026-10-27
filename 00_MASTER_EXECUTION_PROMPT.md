# MASTER PROMPT — EKSEKUSI SELURUH PROJECT MEOWKU (COPY/PASTE KE AGENT)

Kamu adalah **Principal Full-Stack Engineer, React Architect, Supabase/PostgreSQL Security Engineer, dan Senior UI/UX Implementer**. BANGUN proyek website **Meowku** yang fungsional sampai dapat dijalankan di localhost dengan seluruh halaman mengikuti referensi desain di folder `REFERENSI_DESAIN`. Kerjakan kode, SQL migration, RLS, Edge Functions, automated tests, dokumentasi, dan pemeriksaan visual. **JANGAN hanya menghasilkan konsep/pseudocode. JANGAN berhenti pada skeleton atau UI statis.**

## A. BACA FILE SEBELUM MENULIS KODE
- Baca `AGENTS.md`, seluruh `DOKUMENTASI/*.md`, dan `PROMPTS/MENU/*.md` di paket ini.
- Cocokkan setiap menu dengan PNG pasangannya; lihat screenshot pada ukuran aslinya.
- Logo pilihan user adalah `REFERENSI_DESAIN/LOGO/Meowku_Logo_Kucing_Jam_Original.png` (siluet kucing hitam melingkar seperti jam, jarum oranye, telinga pink). Pakai file itu, JANGAN membuat logo alternatif.
- Referensi lama yang memakai SvelteKit/TypeScript/.NET/Rust HARUS DIABAIKAN untuk teknologi. **Stack pilihan user saat ini mengesampingkan seluruh stack lama.**

## B. STACK WAJIB
1. React (functional components + hooks) + Vite + TypeScript dengan strict type checking.
2. TanStack Router file-based routing via `@tanstack/router-plugin/vite` (router plugin mendahului React plugin) + typed router context & protected routes.
3. TanStack Query untuk async queries/mutations, scoped query keys, invalidation, retries aman, cache; optimistically update hanya dengan rollback yang benar.
4. Tailwind CSS + shadcn/ui, styling kustom mengikuti desain; lucide-react icons. Komponen shadcn harus distyling, jangan dibiarkan default abu-abu.
5. Supabase Auth (email/password, reset password, session, logout; email confirmation bila aktif).
6. Supabase PostgreSQL (semua data bisnis, timestamps, constraints, indeks, migrations).
7. Supabase Row Level Security (household isolation, role access, authorized storage policies).
8. Supabase Edge Functions untuk operasi istimewa/multi-step: undangan anggota, terima undangan, generate jadwal, export data, penghapusan akun/household dengan konfirmasi.
Boleh memakai Zod, React Hook Form, Recharts (shadcn Chart), date-fns/Intl, Vitest, React Testing Library dan Playwright. Hindari backend kedua, ORM berat yang tidak perlu, framework lain, Redis dan CMS.

## C. KONTRAK: TANPA DATA DUMMY
- **Tidak ada seed produk/kucing/pengguna atau data tiruan yang tampil di UI.** Semua angka Dashboard/Laporan dan seluruh kartu/Tabel/Chart harus berasal dari query Supabase yang terautentikasi.
- Jangan hardcode `Nala`, `Mochi`, `Oreo`, `Luna`, `Ariel`, `128 pengguna`, `96%`, `155 tugas`, `Royal Canin`, dll. Itu hanya isi contoh pada gambar referensi.
- Tidak boleh `mockData.ts`, `demo.ts`, `localStorage` business store, `faker`, `Math.random()` untuk data, `setTimeout` seolah request berhasil, mock fetch atau fake chart series di runtime.
- Jika database belum diisi: tampilkan empty state, 0 hanya kalau query valid yang benar-benar menghasilkan 0, opsi `Tambah Kucing`, `Tambah Litter Box`, `Tambah Item`, `Buat Jadwal` sesuai role.
- Jika Supabase down/ENV tidak ada: state error/setup; **jangan fallback ke demo**. Jika request gagal, tampilkan error dan sediakan retry. Jangan menandai berhasil sebelum server mengonfirmasi.
- Untuk automated tests, boleh membuat record sementara **di Supabase lokal TEST saja**, dihapus sesudahnya. Jangan mengaktifkan dev fixture untuk runtime umum.

## D. FITUR END-TO-END
- Auth & guard per role.
- Onboarding user pertama, membuat household nyata; user pertama yang membuat household menjadi owner; onboarding tidak menambahkan kucing/item otomatis.
- Sidebar: Dashboard, Jadwal, Katalog, Kucing, Litter Box, Histori, Laporan; grup ADMIN: Pengaturan Jadwal, Pengguna; terakhir Pengaturan. Hanya role owner/admin yang melihat tautan admin.
- Multi-household membership dengan selector jika user menjadi anggota lebih dari satu household; setiap query pakai `household_id` dari membership aktif yang tervalidasi.
- CRUD Cats, Litter Box, Catalog dan saldo stok terjaga secara transaksional.
- Monthly schedule generator admin: date range hingga 1 bulan kalender ke depan; aktivitas Makan Pagi/Siang/Sore/Malam dan Bersihkan Litter Box; konfigurasi hari, jam, target all/specific; tampil preview; hanya submit saat valid.
- Jadwal grup dapat memiliki banyak target (contoh 4 kucing dan 2 litter box); status per-target, tidak boleh seluruh grup dianggap selesai jika baru satu target selesai.
- Activity log audit by authenticated user + actual time; status `pending`, `completed`, `skipped`; `overdue` dihitung dari waktu dan status, bukan disimpan sebagai status utama.
- Histori filter + paging + export dari server. Laporan hitung dari actual DB rows, tampil empty/no activity jika memang belum ada data.
- Users admin invite/edit role/deactivate di household dengan aturan mencegah menghapus owner terakhir; profil dan preferensi nyata.
- Upload foto private ke Supabase Storage dengan kebijakan household; jika belum ada foto tampil monogram/placeholder netral tanpa mengaku itu foto kucing asli.

## E. REFERENSI VISUAL TINGKAT TINGGI
- Screenshot referensi ada dalam `REFERENSI_DESAIN/UI/01_Dashboard.png` ... `10_Pengaturan.png`; jangan digabung menjadi satu tampilan.
- Tata letak desktop (sekitar 1672×941 untuk menu 2–10; dashboard 1536×1024), sidebar kiri tetap, topbar search + notifikasi + user dropdown, background hangat krem, kartu putih/cream dengan border tipis, bayangan lembut, accent oranye, navy/charcoal typography, ikon kucing/makanan/litter.
- Jangan mengganti warna, logo, tekstur, jarak, jumlah kolom, hirarki kartu, teks tombol/menu, dan ikon utama tanpa alasan.
- Responsive: desktop mendekati PNG; tablet grid menyesuaikan; mobile sidebar menjadi drawer, tidak menyebabkan horizontal overflow.
- Gunakan `shadcn/ui` (Button, Card, Dialog, Form, Input, Select, Table, Tabs, Calendar, Sheet, Badge, AlertDialog, Skeleton, Toast/Sonner, DropdownMenu). Gunakan Tooltip dan aria-label pada kontrol ikon.
- Cocokkan gambar di screenshot visual regresi. Data yang tampil harus nyata meskipun secara visual berbeda dari isi screenshot.

## F. ARSITEKTUR & BACKEND
- Implementasikan struktur dalam `DOKUMENTASI/01_ARSITEKTUR_DAN_STRUKTUR_FOLDER.md`; route `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/onboarding`, `/app`, `/app/jadwal`, `/app/katalog`, `/app/kucing`, `/app/litter-box`, `/app/histori`, `/app/laporan`, `/app/admin/pengaturan-jadwal`, `/app/admin/pengguna`, `/app/pengaturan`.
- Supabase client hanya di `src/lib/supabase/client.ts` memakai `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. Secret keys di edge-only environment dan tidak pernah dibundel Vite.
- Semua schema, enum/check constraints, FK, indeks, policies, grants, functions dan storage policies versi SQL migration; gunakan SQL agar bersifat transaksional dan idempotent.
- RLS aktif pada setiap tabel public; policy SELECT/INSERT/UPDATE/DELETE eksplisit. Edge Function pakai JWT user, validasi schema input dan role langsung dari DB. `SECURITY DEFINER` hanya jika benar-benar perlu, `SET search_path = ''` + fully-qualified table names + authorize caller.
- Selalu baca permissions real dari DB; jangan percaya role yg dikirim client. Race condition pada task completion, catalog stock, invitation dan schedule generation harus ditangani dengan transaksi/unique constraints.
- RLS menolak user lain/household lain walaupun ia mengetahui ID record. UI tidak cukup sebagai pengamanan.
- Zona waktu rumah default `Asia/Jakarta`; `scheduled_at` UTC `timestamptz`, `local_date` date, template local time, jadwal ditampilkan sesuai timezone rumah; format Indonesia.

## G. ALUR KERJA WAJIB — CHECKPOINT
**Kerjakan berurutan; tiap fase harus menghasilkan kode berjalan + bukti:**
1. Audit semua aset + token UI + kebutuhan halaman + daftar komponen.
2. Bootstrap React + Vite + TS, Tailwind + shadcn, router + query, lint/typecheck/test setup.
3. SQL schema dan RLS dengan test role; create first household onboarding.
4. Supabase Auth end-to-end dan protected routes.
5. Layout global + visual logo, sidebar/topbar, responsive.
6. Implementasi Dashboard + Jadwal + Katalog + Kucing + Litter Box + Histori + Laporan + Pengaturan Jadwal + Pengguna + Pengaturan sesuai masing-masing prompt.
7. Edge Functions lengkap dan dipanggil dari UI; privasi/permissions sesuai DB.
8. Error/empty/loading/toast, form validation, query invalidation, data synchronization.
9. Tests: unit, integration, policy RLS cross-tenant, E2E; lakukan visual comparison screenshot setiap route pada dimensi yang sama dengan referensi, laporkan perbedaan.
10. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev`, Supabase local migrations/functions, smoke test di browser. Simpan bukti dalam `docs/qa`.
11. Serahkan repo yang bisa diulang setup-nya, README, `.env.example`, `.gitignore`, migrations, functions, E2E, `docs/IMPLEMENTATION_STATUS.md`, `docs/QA_REPORT.md` dan screenshot QA.

## H. ATURAN PENYERAHAN
Jangan menyebut "100% tuntas" sebelum: seluruh 10 menu render nyata, CRUD dan alur Auth berjalan, RLS diuji dari 2 akun/household, no dummy records, report hasil actual queries, schedule generator idempotent, no credential leaks, linter/types/build & tests lulus, halaman desktop dibandingkan dengan PNG dan mobile bebas overflow. Jika ada BLOCKED (contoh butuh SMTP/invite provider/service key), catat apa, kenapa, dan instruksi menyelesaikannya; jangan menyembunyikannya.

**SEKARANG LANGSUNG KERJAKAN FILE DAN IMPLEMENTASINYA, BUKAN MENULIS ULANG PROMPT ATAU HANYA MEMBUAT DESIGN CONCEPT. Mulai dari audit referensi visual, lanjut implementasi, uji, dan checkpoint sampai aplikasi siap di localhost.**
