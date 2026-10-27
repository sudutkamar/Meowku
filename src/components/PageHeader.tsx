const compactDescriptions: Record<string, string> = {
  'Preferensi ini tersimpan di PostgreSQL dan dipakai oleh jadwal.': 'Atur zona waktu dan preferensi rumahmu.',
  'Catatan perubahan rumah yang tidak dapat diubah atau dihapus.': 'Riwayat perubahan yang tersimpan.',
  'Atur siapa yang menerima tugas perawatan pada setiap hari, tanpa harus membuat mereka login.': 'Atur petugas untuk tiap hari.',
  'Ringkasan dihitung dari data database pada rentang tanggal yang dipilih.': 'Lihat ringkasan perawatan sesuai tanggal.',
  'Atur perawatan, slot waktu, target, dan checklist berdasarkan zona waktu rumah.': 'Atur jadwal dan checklist kucingmu.',
};

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">MEOWKU / {eyebrow}</p><h1>{title}</h1><p>{compactDescriptions[description] ?? description}</p></div>{action}</div>;
}
