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
  };
  const message = error?.code ? messages[error.code] : undefined;
  return new Error(message ?? error?.message ?? 'Ada masalah. Coba lagi.');
}
