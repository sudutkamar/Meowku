export type ScheduleInput = { title: string };
export function validateScheduleInput(input: ScheduleInput) { if (!input.title.trim()) throw new Error('Judul wajib diisi.'); }
