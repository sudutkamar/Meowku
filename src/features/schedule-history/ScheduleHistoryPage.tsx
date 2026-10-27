import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, Clock3 } from 'lucide-react';
import type { Household } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { PageSkeleton } from '../../components/Skeleton';
import { householdLocalDate } from '../dashboard/useDashboard';
import { useCompleteOccurrence, useScheduleMembers, useScheduleOccurrences, useScheduleTargetOptions, useSchedules, type OccurrenceFilter, type ScheduleOccurrence, type ScheduleRecord } from '../schedules/useSchedules';

const filters: Array<{ value: OccurrenceFilter; label: string }> = [{ value: 'Today', label: 'Hari ini' }, { value: 'This Week', label: 'Minggu ini' }, { value: 'This Month', label: 'Bulan ini' }];
const categoryFilters = [{ value: 'all', label: 'Semua kategori' }, { value: 'feeding', label: 'Makan' }, { value: 'litter', label: 'Litter box' }, { value: 'medicine', label: 'Obat' }, { value: 'other', label: 'Lainnya' }];
const categoryLabels: Record<string, string> = { feeding: 'Makan', litter: 'Litter box', medicine: 'Obat', other: 'Lainnya' };

function occurrenceCategory(item: ScheduleOccurrence) {
  const custom = item.schedules?.category === 'other' ? item.schedules.custom_category?.trim() : '';
  return custom ? `custom:${custom}` : item.schedules?.category ?? 'other';
}

function categoryLabel(category: string) {
  return category.startsWith('custom:') ? category.slice(7) : categoryLabels[category] ?? 'Lainnya';
}

function targetName(targetKey: string, names: Map<string, string>) {
  if (targetKey === 'household') return 'Semua rumah';
  return names.get(targetKey) ?? targetKey.replace(/^(cat|litter):/, '');
}

function statusFor(item: ScheduleOccurrence) {
  if (item.archived_at) return { key: 'skipped', label: 'Dilewati' };
  if (item.completed_at) return { key: 'completed', label: 'Selesai' };
  return new Date(item.scheduled_at).getTime() < Date.now() ? { key: 'missed', label: 'Terlewat' } : { key: 'pending', label: 'Menunggu' };
}

function memberLabel(userId: string | null, names: Map<string, string>) {
  if (!userId) return 'Belum ditugaskan';
  return names.get(userId) ?? userId;
}

function recurrenceLabel(item: ScheduleOccurrence) {
  const schedule = item.schedules;
  if (!schedule) return '';
  const units = { day: 'hari', week: 'minggu', month: 'bulan' };
  return `Mulai ${schedule.start_date ?? '—'} · berulang tiap ${schedule.repeat_interval || 1} ${units[schedule.repeat_unit]}${schedule.end_date ? ` · sampai ${schedule.end_date}` : ' · tanpa tanggal akhir'}`;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function utcDate(value: string) {
  return new Date(`${dateOnly(value)}T00:00:00Z`);
}

function daysBetween(from: string, to: string) {
  return Math.round((utcDate(to).getTime() - utcDate(from).getTime()) / 86400000);
}

function isLastDayOfMonth(value: string) {
  const date = utcDate(value);
  return date.getUTCDate() === new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function scheduleStartDate(schedule: ScheduleRecord, fallbackDate: string) {
  if (schedule.start_date) return schedule.start_date;
  if (schedule.scheduled_at) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: schedule.timezone || 'Asia/Jakarta' }).format(new Date(schedule.scheduled_at));
  }
  return fallbackDate;
}

function scheduleIsDueOn(schedule: ScheduleRecord, date: string) {
  const startDate = scheduleStartDate(schedule, date);
  const normalizedDate = dateOnly(date);
  const normalizedStartDate = dateOnly(startDate);
  const normalizedEndDate = schedule.end_date ? dateOnly(schedule.end_date) : null;
  if (schedule.is_active === false || schedule.status === 'paused' || schedule.status === 'archived' || normalizedDate < normalizedStartDate || (normalizedEndDate && normalizedDate > normalizedEndDate)) return false;
  const elapsed = daysBetween(normalizedStartDate, normalizedDate);
  const interval = Math.max(1, schedule.repeat_interval || 1);
  if (schedule.repeat_unit !== 'week' && schedule.repeat_unit !== 'month') return elapsed % interval === 0;
  if (schedule.repeat_unit === 'week') {
    const weekday = utcDate(date).getUTCDay() || 7;
    return Math.floor(elapsed / 7) % interval === 0 && (!(schedule.days_of_week ?? []).length || Boolean(schedule.days_of_week?.includes(weekday)));
  }
  const start = utcDate(startDate);
  const current = utcDate(date);
  const monthDistance = (current.getUTCFullYear() - start.getUTCFullYear()) * 12 + current.getUTCMonth() - start.getUTCMonth();
  const expectedDay = schedule.day_of_month ?? start.getUTCDate();
  return monthDistance >= 0 && monthDistance % interval === 0 && (schedule.last_day ? isLastDayOfMonth(date) : current.getUTCDate() === expectedDay);
}

function scheduleTimeToIso(date: string, time: string, timezone: string) {
  const offset = timezone === 'Asia/Jayapura' ? '+09:00' : timezone === 'Asia/Makassar' ? '+08:00' : '+07:00';
  return new Date(`${date}T${time.slice(0, 8)}${offset}`).toISOString();
}

function fallbackTomorrowOccurrences(schedules: ScheduleRecord[], date: string, timezone: string) {
  return schedules.filter((schedule) => scheduleIsDueOn(schedule, date)).flatMap((schedule) => {
    const targets = schedule.targets.length ? schedule.targets : [{ target_key: 'household' }];
    const slots = schedule.slots.length ? schedule.slots : [{ label: schedule.title, local_time: schedule.time, sort_order: 0, is_active: true }];
    return slots.filter((slot) => slot.is_active !== false).flatMap((slot) => targets.map((target) => ({
      id: `preview-${schedule.id}-${slot.id ?? slot.sort_order}-${target.target_key}-${date}`,
      schedule_id: schedule.id,
      target_key: target.target_key,
      slot_id: slot.id ?? `${schedule.id}-${slot.sort_order}`,
      local_date: date,
      scheduled_at: scheduleTimeToIso(date, slot.local_time, timezone),
      assigned_to: null,
      assignee_id: null,
      completed_at: null,
      completed_by: null,
      archived_at: null,
      schedules: { title: schedule.title, category: schedule.category, custom_category: schedule.custom_category ?? null, status: schedule.status, is_active: schedule.is_active, start_date: schedule.start_date, end_date: schedule.end_date ?? null, repeat_interval: schedule.repeat_interval, repeat_unit: schedule.repeat_unit },
      schedule_slots: { label: slot.label, local_time: slot.local_time },
      household_assignees: null,
    } satisfies ScheduleOccurrence)));
  });
}

function mergeTomorrowOccurrences(actual: ScheduleOccurrence[], schedules: ScheduleRecord[], date: string, timezone: string) {
  const existing = new Set(actual.map((item) => `${item.schedule_id}:${item.slot_id}:${item.target_key}`));
  return [...actual, ...fallbackTomorrowOccurrences(schedules, date, timezone).filter((item) => !existing.has(`${item.schedule_id}:${item.slot_id}:${item.target_key}`))].sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at));
}

function HistoryTimeline({ occurrences, timezone, targetNames, memberNames, onComplete, busy }: { occurrences: ScheduleOccurrence[]; timezone: string; targetNames: Map<string, string>; memberNames: Map<string, string>; onComplete: (id: string) => void; busy: boolean }) {
  const grouped = useMemo(() => occurrences.reduce<Map<string, ScheduleOccurrence[]>>((result, item) => { const items = result.get(item.local_date) ?? []; items.push(item); items.sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at)); result.set(item.local_date, items); return result; }, new Map()), [occurrences]);
  if (!occurrences.length) return <div className="empty small"><CalendarDays /><p>Tidak ada jadwal pada rentang ini.</p></div>;
  const byCategory = (items: ScheduleOccurrence[]) => Array.from(items.reduce<Map<string, ScheduleOccurrence[]>>((result, item) => { const key = occurrenceCategory(item); result.set(key, [...(result.get(key) ?? []), item]); return result; }, new Map()).entries());
  return <div className="schedule-history-timeline">{Array.from(grouped.entries()).map(([date, items]) => <div className="schedule-history-day" key={date}><div className="schedule-history-date"><b>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(new Date(`${date}T12:00:00`))}</b><small>{date}</small></div><div className="schedule-history-items">{byCategory(items).map(([category, categoryItems]) => <section className="schedule-history-category" key={category}><div className="schedule-history-category-heading"><strong>{categoryLabel(category)}</strong><span>{categoryItems.length} tugas</span></div>{categoryItems.map((item) => { const status = statusFor(item); return <article className={`schedule-history-item status-${status.key}`} key={item.id}><div className="schedule-history-icon"><Clock3 size={18} /></div><div className="schedule-history-content"><div className="schedule-history-title"><strong>{item.schedules?.title ?? 'Jadwal'}</strong><span className={`occurrence-status status-${status.key}`}>{status.label}</span></div><small>{item.schedule_slots?.label ?? 'Slot'} · {targetName(item.target_key, targetNames)} · {new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: timezone }).format(new Date(item.scheduled_at))}</small><div className="schedule-history-meta"><span>{recurrenceLabel(item)}</span><span>Petugas: <b>{item.household_assignees?.display_name ?? memberLabel(item.assigned_to, memberNames)}</b></span>{item.completed_by && <span>Selesai oleh: <b>{memberLabel(item.completed_by, memberNames)}</b></span>}</div>{(status.key === 'pending' || status.key === 'missed') && <button className="primary" type="button" disabled={busy} onClick={() => onComplete(item.id)}>Tandai selesai</button>}</div></article>; })}</section>)}</div></div>)}</div>;
}

function tomorrowCategoryTone(category: string) {
  if (category.startsWith('custom:')) return 'custom';
  return ['feeding', 'litter', 'medicine', 'other'].includes(category) ? category : 'other';
}

function TomorrowSchedule({ occurrences, timezone, targetNames, memberNames }: { occurrences: ScheduleOccurrence[]; timezone: string; targetNames: Map<string, string>; memberNames: Map<string, string> }) {
  if (!occurrences.length) return <div className="empty small tomorrow-schedule-empty"><CalendarDays /><p>Tidak ada tugas terjadwal untuk besok.</p></div>;
  const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: timezone });
  return <div className="tomorrow-schedule-list" aria-label="Daftar tugas besok">{occurrences.map((item, index) => {
    const category = occurrenceCategory(item);
    const tone = tomorrowCategoryTone(category);
    return <article className={`tomorrow-schedule-item tomorrow-tone-${tone}${index === 0 ? ' is-next' : ''}`} key={item.id}>
      <div className="tomorrow-schedule-time"><time>{timeFormatter.format(new Date(item.scheduled_at))}</time><span>{index === 0 ? 'Paling dekat' : 'Berikutnya'}</span></div>
      <span className="tomorrow-schedule-icon" aria-hidden="true"><Clock3 size={18} /></span>
      <div className="tomorrow-schedule-content">
        <div className="tomorrow-schedule-title"><div className="tomorrow-schedule-heading-copy"><span className="tomorrow-schedule-category">{categoryLabel(category)}</span><strong>{item.schedules?.title ?? 'Jadwal'}</strong></div><span className="tomorrow-schedule-slot">{item.schedule_slots?.label ?? 'Slot'}</span></div>
        <div className="tomorrow-schedule-meta"><span className="tomorrow-schedule-target">{targetName(item.target_key, targetNames)}</span><span>Petugas: <b>{item.household_assignees?.display_name ?? memberLabel(item.assigned_to, memberNames)}</b></span></div>
      </div>
    </article>;
  })}</div>;
}

export function ScheduleHistoryPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [filter, setFilter] = useState<OccurrenceFilter>('Today');
  const [category, setCategory] = useState('all');
  const [tomorrowCategory, setTomorrowCategory] = useState('all');
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const today = householdLocalDate(timezone);
  const occurrences = useScheduleOccurrences(household.id, timezone, filter);
  const tomorrowOccurrences = useScheduleOccurrences(household.id, timezone, 'Tomorrow');
  const schedules = useSchedules(household.id);
  const targets = useScheduleTargetOptions(household.id);
  const members = useScheduleMembers(household.id);
  const complete = useCompleteOccurrence(household.id);
  const targetNames = useMemo(() => new Map([...(targets.data?.cats ?? []).map((cat) => [`cat:${cat.id}`, cat.name] as const), ...(targets.data?.litterBoxes ?? []).map((box) => [`litter:${box.id}`, box.name] as const)]), [targets.data]);
  const memberNames = useMemo(() => new Map((members.data ?? []).map((member) => [member.user_id, member.full_name?.trim() || member.user_id])), [members.data]);
  const loading = occurrences.isLoading || targets.isLoading || members.isLoading;
  const error = occurrences.error ?? targets.error ?? members.error;
  const tomorrowError = tomorrowOccurrences.error ?? schedules.error ?? targets.error ?? members.error;
  const tomorrowDate = useMemo(() => {
    const value = new Date(`${today}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
  }, [today]);
  const filteredOccurrences = useMemo(() => (occurrences.data ?? []).filter((item) => category === 'all' || item.schedules?.category === category), [occurrences.data, category]);
  const tomorrowRows = useMemo(() => {
    const actual = schedules.isLoading
      ? tomorrowOccurrences.data ?? []
      : (tomorrowOccurrences.data ?? []).filter((item) => {
        const schedule = (schedules.data ?? []).find((candidate) => candidate.id === item.schedule_id);
        return Boolean(schedule && scheduleIsDueOn(schedule, tomorrowDate));
      });
    return mergeTomorrowOccurrences(actual, schedules.data ?? [], tomorrowDate, timezone);
  }, [tomorrowOccurrences.data, schedules.data, schedules.isLoading, tomorrowDate, timezone]);
  const tomorrowCategoryOptions = useMemo(() => [{ value: 'all', label: 'Semua kategori' }, ...Array.from(new Set(tomorrowRows.map(occurrenceCategory))).sort((left, right) => categoryLabel(left).localeCompare(categoryLabel(right), 'id')).map((value) => ({ value, label: categoryLabel(value) }))], [tomorrowRows]);
  useEffect(() => {
    if (tomorrowCategory !== 'all' && !tomorrowCategoryOptions.some((item) => item.value === tomorrowCategory)) setTomorrowCategory('all');
  }, [tomorrowCategory, tomorrowCategoryOptions]);
  const filteredTomorrowOccurrences = useMemo(() => tomorrowRows.filter((item) => tomorrowCategory === 'all' || occurrenceCategory(item) === tomorrowCategory), [tomorrowRows, tomorrowCategory]);
  const hasTomorrowTasks = filteredTomorrowOccurrences.length > 0;
  const completedCount = filteredOccurrences.filter((item) => Boolean(item.completed_at)).length;

  return <section className="entity-page schedule-history-page">
    <PageHeader eyebrow="MEOWKU / JADWAL SAYA" title="Jadwal saya" description={`Pantau pembagian dan penyelesaian tugas di rumah · ${today}`} />
    <section className="panel schedule-history-panel">
      <div className="section-heading"><div><p className="eyebrow">CHECKLIST OPERASIONAL</p><h2>Jadwal perawatan</h2></div><span className="date-label">Zona waktu {timezone}</span></div>
      <div className="schedule-history-controls"><div className="schedule-filter-tabs" role="tablist" aria-label="Rentang jadwal saya">{filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><label className="schedule-category-filter">Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
      <div className="schedule-history-summary"><strong>{completedCount} dari {filteredOccurrences.length} tugas selesai</strong><span>{category === 'all' ? 'Semua kategori ditampilkan' : `Kategori ${categoryLabels[category]}`}</span></div>
      <QueryState loading={loading} error={error}><HistoryTimeline occurrences={filteredOccurrences} timezone={timezone} targetNames={targetNames} memberNames={memberNames} onComplete={(id) => complete.mutate({ occurrenceId: id })} busy={complete.isPending} /></QueryState>
      {complete.error && <p className="notice" role="alert">{complete.error.message}</p>}
    </section>
    <section className="panel tomorrow-schedule-panel" aria-labelledby="tomorrow-schedule-title">
      <div className="tomorrow-schedule-heading"><div><p className="eyebrow">NEXT UP</p><h2 id="tomorrow-schedule-title">Jadwal besok</h2><p>Siapkan tugas berikutnya sebelum hari berganti.</p></div>{hasTomorrowTasks && <div className="tomorrow-schedule-actions"><div className="tomorrow-schedule-date"><strong>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(new Date(`${tomorrowDate}T12:00:00`))}</strong><span>{filteredTomorrowOccurrences.length} tugas ditampilkan</span></div><label className="tomorrow-schedule-filter">Kategori<select value={tomorrowCategory} onChange={(event) => setTomorrowCategory(event.target.value)} aria-label="Filter kategori tugas besok">{tomorrowCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="tomorrow-schedule-toggle" type="button" aria-expanded={tomorrowOpen} aria-controls="tomorrow-schedule-content" onClick={() => setTomorrowOpen((value) => !value)}><span>{tomorrowOpen ? 'Sembunyikan tugas' : 'Tampilkan tugas'}</span><ChevronDown size={16} aria-hidden="true" /></button></div>}</div>
      <QueryState loading={tomorrowOccurrences.isLoading || schedules.isLoading || targets.isLoading || members.isLoading} error={tomorrowError} onRetry={() => { void tomorrowOccurrences.refetch(); void schedules.refetch(); void targets.refetch(); void members.refetch(); }}>{tomorrowOpen ? <div id="tomorrow-schedule-content"><TomorrowSchedule occurrences={filteredTomorrowOccurrences} timezone={timezone} targetNames={targetNames} memberNames={memberNames} /></div> : <div id="tomorrow-schedule-content" className="tomorrow-schedule-collapsed" aria-live="polite"><CalendarDays size={17} /><span>Daftar tugas besok disembunyikan. Buka dropdown untuk melihatnya.</span></div>}</QueryState>
    </section>
    <section className="panel schedule-history-note"><CheckCircle2 size={18} /><p>Assignment petugas disimpan pada setiap occurrence. Mengubah rotasi tidak mengubah histori yang sudah tercatat.</p></section>
  </section>;
}
