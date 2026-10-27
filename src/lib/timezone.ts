export const INDONESIA_TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (UTC+7)', name: 'Indonesia Barat' },
  { value: 'Asia/Makassar', label: 'WITA (UTC+8)', name: 'Indonesia Tengah' },
  { value: 'Asia/Jayapura', label: 'WIT (UTC+9)', name: 'Indonesia Timur' },
] as const;

export function timezoneLabel(value: string) {
  return INDONESIA_TIMEZONES.find((timezone) => timezone.value === value)?.label ?? value;
}

export function householdToday(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
}

export function shiftLocalDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
