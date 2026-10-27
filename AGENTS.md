# AGENTS.md — Instruksi Tidak Bisa Ditawar

1. **Gunakan stack final React + Vite + TypeScript, TanStack Router + Query, Tailwind + shadcn/ui, Supabase Auth/Postgres/RLS/Edge.** Abaikan dan jangan menyalin project SvelteKit/.NET/Rust lama; aset UI/UX saja yang boleh dipakai dari paket terdahulu.
2. **Satu-satunya sumber data bisnis adalah Supabase PostgreSQL.** Tidak boleh mock repository, hardcoded metrics, sample cats/products/users, seed.sql yang memuat record fiktif, hardcoded hasil chart, fake API response, atau localStorage untuk domain state. Placeholder input, ilustrasi dekoratif, dan test fixtures dalam DB test terisolasi diperbolehkan, tidak boleh muncul di app umum.
3. Jika kredensial Supabase belum tersedia, tampilkan `SetupRequired` informatif atau gunakan Supabase CLI lokal. JANGAN diam-diam beralih ke mock data.
4. Ikuti 10 screenshot satu per satu; logo yang dipilih tidak boleh diganti. Screenshot bukan gambar latar halaman dan bukan source data.
5. Pertahankan istilah bahasa Indonesia, sidebar menu, struktur halaman, warm cream + orange, rounded cards, tipografi dan hierarki dari referensi.
6. Implementasikan seluruh alur sampai berjalan: Auth, onboarding, household, cats, litter boxes, catalog, jadwal, checklist selesai, histori audit, laporan hasil query, manajemen anggota, settings, export; tidak ada tombol hias.
7. Gunakan **RLS aktif di semua tabel aplikasi**; cek keamanan multi-household dan role owner/admin/member di database dan Edge Functions. Client guard hanyalah UX, bukan pengganti RLS.
8. Edge Functions harus memverifikasi identitas dari JWT dan otoritas berdasarkan database. Jangan menerima role/household arbitrary sebagai sumber otorisasi; jangan letakkan service-role di frontend.
9. Jadwal bulanan idempotent, timezone Asia/Jakarta default tetapi configurable, penyelesaian per target kucing/litter, audit immutable, tugas jadwal masa lalu tidak tertimpa regenerate.
10. Ketika menyelesaikan tiap fase, dokumentasikan file yang dibuat, migrasi, perintah, screenshot visual QA, bukti testing, bug, dan status PASS/FAIL/BLOCKED. Jangan klaim PASS jika belum dijalankan.
11. Jangan deploy ke internet; hanya localhost. Jangan melakukan `db reset --linked` atau operasi destruktif pada project remote.
12. Jika ada detail visual tidak terbaca, cocokkan komposisi screenshot dan dokumentasikan interpretasi; jangan mengorbankan fungsi atau keamanan untuk menyamai data palsu di gambar.
