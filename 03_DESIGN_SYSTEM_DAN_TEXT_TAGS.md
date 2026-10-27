# 03 — Design System + Text Tags yang Diimplementasi Sesuai Referensi

## Visual source of truth
`REFERENSI_DESAIN/UI/01_Dashboard.png` (1536×1024), `02_Jadwal.png` sampai `10_Pengaturan.png` (1672×941), logo original 1254×1254. Jangan memakai gambar screenshot sebagai page background; harus membuat komponen asli agar interaktif, bisa mobile, accessible, dan dynamic dari DB.

## Style target
- Brand: Meowku; logo siluet kucing hitam berbentuk jam dengan aksen oranye dan pink.
- Warna pendekatan awal dari mockup (**sampling screenshot boleh mengoreksi**): primary `#FF7417`–`#FF7A12`, primary-hover `#EC6200`, page cream `#FFF9F2`, card white `#FFFFFF`, muted peach `#FFF0E3`, title charcoal `#142039`/`#17233A`, text-muted slate `#63718C`, success green `#15B972`, info blue `#2BA8F5`, danger red `#EE4C4C`.
- Font: sans-serif modern yang dekat preview; gunakan font open-license seperti Inter/Plus Jakarta Sans bila tersedia. Prioritas screenshot: bobot judul bold, body 13–15px, numerals tabular, keterbacaan.
- Radius card 14–22px, tombol 9–14px; outline lembut, subtle shadow, vertical spacing ~16–24px, toolbar ~64–78px, sidebar desktop ~260–290px.
- Sidebar cream-putih, item active peach; logo pojok atas; kelompok ADMIN dibedakan heading; bottom cat illustration bersifat dekoratif.
- Topbar: pencarian (kucing, jadwal atau aktivitas) memfilter/menavigasi hasil real, shortcut Ctrl/Cmd+K jika benar-benar diterapkan, bell menampilkan in-app notifications, user menu/avatar dari auth profile (bukan nama contoh), action logout.
- Empty/loading/error: skeleton menjaga geometri kartu yang sama, empty state ramah tetapi tidak menipu, toast dan AlertDialog untuk aksi irreversible.
- Responsive: 1672px desktop dekat referensi; 1280px ukuran grid turun; 768px sidebar collapsible; 375px mobile satu kolom, tables scroll secara wajar, forms full width, touch area minimum 44px.

## Route menu & label persis
1. `Dashboard` — `/app`
2. `Jadwal` — `/app/jadwal`
3. `Katalog` — `/app/katalog`
4. `Kucing` — `/app/kucing`
5. `Litter Box` — `/app/litter-box`
6. `Histori` — `/app/histori`
7. `Laporan` — `/app/laporan`
8. `Pengaturan Jadwal` — `/app/admin/pengaturan-jadwal` (admin/owner only)
9. `Pengguna` — `/app/admin/pengguna` (admin/owner only)
10. `Pengaturan` — `/app/pengaturan`

## Text tags utama (jangan gunakan label bahasa Inggris untuk UI normal)
| Konteks | Label/action / keadaan |
|---|---|
| Global | `Cari kucing, jadwal, atau aktivitas...`, `Tambah`, `Simpan`, `Simpan Perubahan`, `Batal`, `Edit`, `Hapus`, `Lihat Semua`, `Muat Ulang`, `Belum Ada Data`, `Coba Lagi`, `Keluar` |
| Onboarding | `Selamat datang di Meowku`, `Buat Rumah Pertama`, `Nama Rumah`, `Mulai Kelola` |
| Dashboard | `Selamat pagi/siang/sore/malam`, `Jadwal Hari Ini`, `Ringkasan Mingguan`, `Aktivitas Terbaru`, `Jadwal Mendatang`, `Total Makan`, `Litter Box`, `Konsistensi`, `Tambah Kucing` |
| Jadwal | `Jadwal`, `Tambah Jadwal`, `Bulan`, `Minggu`, `Hari`, `Hari ini`, `Ubah Tanggal`, `Progress Hari Ini`, `Makan Pagi`, `Makan Siang`, `Makan Sore`, `Makan Malam`, `Bersihkan Litter Box`, `Tandai Selesai` |
| Katalog | `Katalog`, `Tambah Item`, `Semua`, `Makanan`, `Pasir`, `Obat`, `Perlengkapan`, `Template Perawatan`, `Stok Menipis`, `Stok`, `Cari item katalog...`, `Penyesuaian Stok`, `Tambah ke Jadwal` |
| Kucing | `Kucing`, `Tambah Kucing`, `Ringkasan`, `Jadwal`, `Riwayat Makan`, `Berat Badan`, `Catatan`, `Galeri`, `Catatan Kesehatan`, `Tambah Catatan`, `Ubah Foto` |
| Litter | `Litter Box`, `Tambah Litter Box`, `Kondisi Saat Ini`, `Terakhir Dibersihkan`, `Tandai Dibersihkan`, `Jadwal`, `Riwayat`, `Catatan`, `Ringkasan Perawatan`, `Lokasi` |
| Histori | `Histori Aktivitas`, `Tanggal`, `Kucing`, `Aktivitas`, `User`, `Status`, `Reset Filter`, `Export`, `Daftar Histori Aktivitas` |
| Laporan | `Laporan`, `Ekspor Laporan`, `Aktivitas Harian`, `Tren Konsistensi`, `Ringkasan Performa`, `Insight & Analisis`, `Distribusi Aktivitas`, `Total Tugas Makan`, `Total Pembersihan Litter Box` |
| Jadwal Admin | `Pengaturan Jadwal`, `Buat Jadwal Baru`, `Periode Jadwal`, `Tanggal Mulai`, `Tanggal Selesai`, `Pilih Aktivitas & Waktu`, `Target Kucing`, `Semua Kucing`, `Pilih Kucing Tertentu`, `Preview Jadwal`, `Generate Jadwal` |
| Pengguna | `Pengguna`, `Tambah Pengguna`, `Total Pengguna`, `Pengguna Aktif`, `Pengguna Nonaktif`, `Semua Role`, `Semua Status`, `Urutkan`, `Aktif`, `Nonaktif`, `Undang Pengguna` |
| Pengaturan | `Pengaturan`, `Profil & Akun`, `Notifikasi`, `Tampilan`, `Data & Privasi`, `Jadwal`, `Pengguna`, `Integrasi`, `Tentang`, `Terang`, `Gelap`, `Sistem`, `Ekspor Data`, `Hapus Akun`, `Pengingat Jadwal`, `Ringkasan Harian` |
| State | `Belum`, `Menunggu`, `Selesai`, `Dilewati`, `Terlambat`, `Gagal memuat data`, `Anda tidak memiliki akses`, `Tidak ada aktivitas pada periode ini`, `Data berhasil disimpan` |

## UX non-palsu
- Label `Hari ini` memakai jam saat itu dan timezone household, bukan hardcoded 23 Okt 2026.
- Greeting dari profil user sesungguhnya, nama kucing dari tabel cats, status dari task targets, aktivitas terbaru dari audit logs, chart dari aggregation query.
- `Tambah Pengguna` adalah undangan rumah, bukan membuat auth.user palsu.
- `Stok Menipis` hanya dihitung dari catalog_items ketika real stock <= min stock. `Template Perawatan` tab hanya muncul jika fitur template memiliki backend nyata; jika belum, jangan tombol dead-end.
- Upload gambar asli atau fallback ikon/monogram. Ilustrasi kucing hias boleh dalam layout tetapi bukan entitas cats.
- Diagram laporan tanpa DB rows: empty chart dengan ajakan mencatat aktivitas, bukan garis/column palsu.

## Pixel QA
Agent harus mengambil screenshot masing-masing route setelah render pada viewport sesuai PNG. Tulis perbedaan visual yang perlu dibetulkan (posisi sidebar, ukuran cards, spacing, warna, typography, iconography). Jangan memanipulasi screenshot aplikasi dengan overlay PNG referensi, dan jangan mengklaim 100% pixel-identical jika isi data berubah/komponen dinamis.
