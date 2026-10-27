import type { ScheduleInput } from './useSchedules';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addInterval(startDate: string, interval: number, unit: ScheduleInput['repeat_unit']) {
  const date = parseDate(startDate);
  if (unit === 'day') date.setUTCDate(date.getUTCDate() + interval);
  if (unit === 'week') date.setUTCDate(date.getUTCDate() + interval * 7);
  if (unit === 'month') {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + interval);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  return formatDate(date);
}

export function calculateEndDate(startDate: string, interval: number, unit: ScheduleInput['repeat_unit']) {
  const date = parseDate(addInterval(startDate, interval, unit));
  date.setUTCDate(date.getUTCDate() - 1);
  return formatDate(date);
}

export function validateSchedule(input: ScheduleInput) {
  if (!input.title.trim()) return 'Judul jadwal wajib diisi.';
  if (input.category === 'other' && !input.custom_category?.trim()) return 'Nama kategori lainnya wajib diisi.';
  if (input.custom_category && input.custom_category.trim().length > 80) return 'Nama kategori maksimal 80 karakter.';
  const slots = (input.slots ?? []).filter((slot) => slot.is_active !== false);
  if (!slots.length) return 'Minimal satu slot waktu wajib diisi.';
  if (slots.some((slot) => !slot.label.trim() || !/^\d{2}:\d{2}/.test(slot.local_time))) return 'Setiap slot harus memiliki label dan jam yang valid.';
  if (!Number.isInteger(input.repeat_interval) || input.repeat_interval <= 0) return 'Interval harus berupa angka positif.';
  if (!datePattern.test(input.start_date)) return 'Tanggal mulai wajib diisi.';
  if (!input.end_date || !datePattern.test(input.end_date)) return 'Tanggal berakhir wajib diisi.';
  if (input.end_date < input.start_date) return 'Tanggal berakhir tidak boleh sebelum tanggal mulai.';
  if (input.repeat_unit === 'week' && (input.days_of_week ?? []).some((day) => day < 1 || day > 7)) return 'Hari dalam minggu tidak valid.';
  if (input.repeat_unit === 'month' && !input.last_day && (!input.day_of_month || input.day_of_month < 1 || input.day_of_month > 31)) return 'Pilih hari dalam bulan atau hari terakhir.';
  return null;
}
