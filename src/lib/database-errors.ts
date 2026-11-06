type DatabaseError = { code?: string; message?: string };

export function toDatabaseError(cause: unknown): Error {
  if (cause instanceof Error && !('code' in cause)) return cause;
  const error = cause as DatabaseError | null;
  const messages: Record<string, string> = {
    '23505': 'Data ini sudah ada.',
    '23503': 'Data masih dipakai atau tidak ditemukan.',
    '42501': 'Kamu tidak punya akses untuk ini.',
    PGRST116: 'Data tidak ditemukan.',
    PGRST202: 'Fitur ini belum siap. Coba lagi setelah database diperbarui.',
    PGRST204: 'Perubahan belum bisa disimpan.',
    PGRST205: 'Database belum siap. Coba lagi setelah diperbarui.',
    invalid_timezone: 'Zona waktu tidak valid.',
    schedule_has_history_archive_instead: 'Jadwal ini sudah memiliki histori. Arsipkan jadwal agar histori tetap aman.',
    household_admin_required: 'Hanya owner atau admin yang dapat melakukan perubahan ini.',
    household_owner_required: 'Hanya owner rumah yang dapat memindahkan kepemilikan.',
    ownership_target_not_member: 'Pemilik baru harus menjadi anggota aktif household.',
    ownership_target_must_differ: 'Pilih anggota lain sebagai pemilik baru.',
  };
  const message = error?.code ? messages[error.code] : undefined;
  const detailMessage = error?.message ? Object.entries(messages).find(([key]) => error.message?.includes(key))?.[1] : undefined;
  return new Error(message ?? detailMessage ?? error?.message ?? 'Ada masalah. Coba lagi.');
}
