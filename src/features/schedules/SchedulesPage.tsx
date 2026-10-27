import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { Household } from '../../lib/types';
import { householdLocalDate } from '../dashboard/useDashboard';
import {
  useArchiveOccurrence, useArchiveSchedule, useCompleteOccurrence, useCreateSchedule, useDeleteSchedule,
  usePauseSchedule, useRestoreSchedule, useResumeSchedule, useScheduleOccurrences, useScheduleTargetOptions, useSchedules, useUpdateSchedule,
  type OccurrenceFilter, type ScheduleInput, type ScheduleOccurrence, type ScheduleRecord, type ScheduleStatus,
} from './useSchedules';
import { calculateEndDate, validateSchedule } from './scheduleForm';
import { PageSkeleton } from '../../components/Skeleton';
import { timezoneLabel } from '../../lib/timezone';
import { TimeField } from '../../components/TimeField';
import { DateInput } from '../../components/DateInput';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';
import { useScheduleRotation, useScheduleRotationMembers } from '../members/useScheduleRotation';

const weekdays = [{ value: 1, label: 'Sen' }, { value: 2, label: 'Sel' }, { value: 3, label: 'Rab' }, { value: 4, label: 'Kam' }, { value: 5, label: 'Jum' }, { value: 6, label: 'Sab' }, { value: 7, label: 'Min' }];
const filters: Array<{ value: OccurrenceFilter; label: string }> = [{ value: 'Today', label: 'Hari ini' }, { value: 'This Week', label: 'Minggu ini' }, { value: 'This Month', label: 'Bulan ini' }];

function blankFor(timezone: string): ScheduleInput {
  const today = householdLocalDate(timezone);
  return { title: '', category: 'feeding', custom_category: '', start_date: today, end_date: calculateEndDate(today, 1, 'day'), repeat_interval: 1, repeat_unit: 'day', timezone, time: '08:00', day_of_month: Number(today.slice(8, 10)), slots: [{ label: '', local_time: '08:00', sort_order: 0, is_active: true }], targets: [] };
}

function inputFromSchedule(schedule: ScheduleRecord): ScheduleInput {
  return { title: schedule.title, category: schedule.category, custom_category: schedule.custom_category ?? '', start_date: schedule.start_date, end_date: schedule.end_date, repeat_interval: schedule.repeat_interval, repeat_unit: schedule.repeat_unit, timezone: schedule.timezone, time: schedule.time, days_of_week: schedule.days_of_week ?? [], day_of_month: schedule.day_of_month, last_day: schedule.last_day, slots: schedule.slots.map((slot, index) => ({ ...slot, local_time: slot.local_time.slice(0, 5), sort_order: index })), targets: schedule.targets.map((target) => ({ ...target })) };
}

function occurrenceStatus(item: ScheduleOccurrence) {
  if (item.archived_at) return { key: 'skipped', label: 'Dilewati' };
  if (item.completed_at) return { key: 'completed', label: 'Selesai' };
  return new Date(item.scheduled_at).getTime() < Date.now() ? { key: 'missed', label: 'Terlewat' } : { key: 'pending', label: 'Menunggu' };
}

function targetName(targetKey: string, names: Map<string, string>) {
  if (targetKey === 'household') return 'Semua household';
  return names.get(targetKey) ?? targetKey.replace(/^(cat|litter):/, '');
}

function ChecklistTimeline({ occurrences, timezone, targetNames, onComplete, onArchive, busy }: { occurrences: ScheduleOccurrence[]; timezone: string; targetNames: Map<string, string>; onComplete: (id: string) => void; onArchive: (id: string) => void; busy: boolean }) {
  const grouped = useMemo(() => occurrences.reduce<Map<string, ScheduleOccurrence[]>>((result, item) => { const items = result.get(item.local_date) ?? []; items.push(item); items.sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at)); result.set(item.local_date, items); return result; }, new Map()), [occurrences]);
  if (!occurrences.length) return <div className="empty small"><span>✓</span><p>Tidak ada tugas pada rentang ini.</p></div>;
  return <div className="schedule-timeline">{Array.from(grouped.entries()).map(([date, items]) => <div className="timeline-day" key={date}><div className="timeline-date"><b>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(new Date(`${date}T12:00:00`))}</b><small>{date}</small></div><div className="timeline-items">{items.map((item) => { const status = occurrenceStatus(item); return <div className={`timeline-item status-${status.key}`} key={item.id}><span className="timeline-dot" /><div className="timeline-content"><div><b>{item.schedules?.title ?? 'Jadwal'}</b><small>{item.schedule_slots?.label ?? 'Slot'} · {targetName(item.target_key, targetNames)} · {new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: timezone }).format(new Date(item.scheduled_at))}</small></div><span className="occurrence-status">{status.label}</span></div>{status.key === 'pending' || status.key === 'missed' ? <div className="row-actions"><button type="button" className="secondary" disabled={busy} onClick={() => onComplete(item.id)}>Tandai selesai</button><ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan tugas?" description="Tugas ini akan ditandai dilewati dan tetap tercatat di histori." confirmLabel="Arsipkan tugas" pending={busy} onConfirm={() => onArchive(item.id)} /></div> : null}</div>; })}</div></div>)}</div>;
}

function ScheduleRotationSummary({ rotation, members }: { rotation: ReturnType<typeof useScheduleRotation>; members: ReturnType<typeof useScheduleRotationMembers> }) {
  const names = new Map((members.data ?? []).map((member) => [member.id, member.display_name]));
  const days = [{ value: 1, label: 'Sen' }, { value: 2, label: 'Sel' }, { value: 3, label: 'Rab' }, { value: 4, label: 'Kam' }, { value: 5, label: 'Jum' }, { value: 6, label: 'Sab' }, { value: 7, label: 'Min' }];
  const assigned = new Map((rotation.data?.days ?? []).map((day) => [day.weekday, names.get(day.assignee_id) ?? 'Belum ditugaskan']));
  return <div className="schedule-rotation-summary"><div><strong>Penugasan otomatis</strong><small>{rotation.data ? 'Jadwal ini mengikuti rotasi Pengaturan Jadwal.' : 'Belum ada rotasi aktif. Atur petugas di Pengaturan Jadwal.'}</small></div><div className="schedule-rotation-summary-days">{days.map((day) => <span key={day.value}><b>{day.label}</b><small>{assigned.get(day.value) ?? '—'}</small></span>)}</div></div>;
}

export function SchedulesPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const schedules = useSchedules(household.id);
  const options = useScheduleTargetOptions(household.id);
  const rotation = useScheduleRotation(household.id);
  const rotationMembers = useScheduleRotationMembers(household.id);
  const [filter, setFilter] = useState<OccurrenceFilter>('Today');
  const occurrences = useScheduleOccurrences(household.id, timezone, filter);
  const create = useCreateSchedule(household.id);
  const update = useUpdateSchedule(household.id);
  const complete = useCompleteOccurrence(household.id);
  const archiveOccurrence = useArchiveOccurrence(household.id);
  const pause = usePauseSchedule(household.id);
  const restore = useRestoreSchedule(household.id);
  const resume = useResumeSchedule(household.id);
  const archive = useArchiveSchedule(household.id);
  const remove = useDeleteSchedule(household.id);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => blankFor(timezone));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const targetNames = useMemo(() => new Map([...(options.data?.cats ?? []).map((cat) => [`cat:${cat.id}`, cat.name] as const), ...(options.data?.litterBoxes ?? []).map((box) => [`litter:${box.id}`, box.name] as const)]), [options.data]);
  const visibleSchedules = useMemo(() => (schedules.data ?? []).filter((schedule) => statusFilter === 'all' || schedule.status === statusFilter), [schedules.data, statusFilter]);
  const loading = schedules.isLoading || occurrences.isLoading || options.isLoading;
  const queryError = schedules.error ?? occurrences.error ?? options.error;
  const mutationError = create.error ?? update.error ?? complete.error ?? archiveOccurrence.error ?? pause.error ?? restore.error ?? resume.error ?? archive.error ?? remove.error;

  function change(changes: Partial<ScheduleInput>) {
    const next = { ...form, ...changes };
    if (changes.repeat_unit === 'month' && !next.last_day && changes.day_of_month === undefined) next.day_of_month = Number(next.start_date.slice(8, 10));
    if (changes.start_date && next.repeat_unit === 'month' && !next.last_day) next.day_of_month = Number(next.start_date.slice(8, 10));
    const previousAutomaticEndDate = calculateEndDate(form.start_date, form.repeat_interval, form.repeat_unit);
    if (changes.start_date && form.end_date === previousAutomaticEndDate) next.end_date = calculateEndDate(next.start_date, form.repeat_interval, form.repeat_unit);
    setForm(next); setFormError(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const error = validateSchedule(form);
    setFormError(error);
    if (error) return;
    const onSuccess = () => { setForm(blankFor(timezone)); setEditingId(null); setFormError(null); };
    if (editingId) update.mutate({ scheduleId: editingId, definition: form }, { onSuccess });
    else create.mutate(form, { onSuccess });
  }
  function edit(schedule: ScheduleRecord) { setEditingId(schedule.id); setForm(inputFromSchedule(schedule)); setFormError(null); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function toggleTarget(target: { target_key: string; cat_id?: string | null; litter_box_id?: string | null }) { const selected = form.targets ?? []; const exists = selected.some((item) => item.target_key === target.target_key); change({ targets: exists ? selected.filter((item) => item.target_key !== target.target_key) : [...selected, target] }); }
  function toggleDay(day: number) { const selected = form.days_of_week ?? []; change({ days_of_week: selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day].sort() }); }
  function reorderSlot(fromIndex: number, toIndex: number) {
    const activeSlots = (form.slots ?? []).filter((slot) => slot.is_active !== false);
    if (fromIndex === toIndex || !activeSlots[fromIndex] || !activeSlots[toIndex]) return;
    const reordered = [...activeSlots];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    let activeIndex = 0;
    change({ slots: (form.slots ?? []).map((slot) => slot.is_active === false ? slot : { ...reordered[activeIndex], sort_order: activeIndex++ }) });
    setDraggedSlotIndex(null); setDragOverSlotIndex(null);
  }
  function moveSlot(index: number, direction: -1 | 1) { reorderSlot(index, index + direction); }
  if (loading) return <PageSkeleton variant="schedule" />;
  if (queryError) return <section className="panel entity-page query-state"><h2>Jadwal belum dapat dimuat</h2><p role="alert">{queryError.message}</p><button type="button" onClick={() => { void schedules.refetch(); void occurrences.refetch(); void options.refetch(); }}>Coba lagi</button></section>;

  return <section className="entity-page">
    <div className="page-heading"><div><p className="eyebrow">MEOWKU / TAMBAH JADWAL</p><h1>Tambah jadwal</h1><p>Atur perawatan, slot waktu, target, dan checklist berdasarkan zona waktu household.</p></div></div>
    <ScheduleRotationSummary rotation={rotation} members={rotationMembers} />
    <div className="entity-layout schedule-layout">
        <form ref={formRef} className={`panel entity-form-card schedule-form${editingId ? ' is-editing' : ''}`} onSubmit={submit} noValidate>
        <div className="form-card-heading"><div><p className="eyebrow">{editingId ? 'EDIT JADWAL' : 'JADWAL BARU'}</p><h2>{editingId ? 'Edit jadwal' : 'Tambah jadwal'}</h2></div><span className="schedule-badge">{timezoneLabel(timezone)}</span></div>
        {(formError || mutationError) && <p className="notice" role="alert">{formError ?? mutationError?.message}</p>}
        <label>Judul<input required value={form.title} onChange={(event) => change({ title: event.target.value })} placeholder="Contoh: Beri makan pagi" /></label>
        <label>Kategori<select value={form.category} onChange={(event) => change({ category: event.target.value as ScheduleInput['category'] })}><option value="feeding">Makan</option><option value="litter">Litter box</option><option value="medicine">Obat</option><option value="other">Lainnya</option></select></label>
        {form.category === 'other' && <label className="custom-category-field">Nama kategori custom<input required maxLength={80} value={form.custom_category ?? ''} onChange={(event) => change({ custom_category: event.target.value })} placeholder="Contoh: Grooming, Vitamin, atau Bermain" /><small className="field-hint">Nama ini akan muncul sebagai kelompok sendiri di dashboard dan checklist.</small></label>}
        <fieldset className="recurrence-fieldset"><legend>Slot waktu</legend>{(form.slots ?? []).filter((slot) => slot.is_active !== false).map((slot, index, activeSlots) => <div className={`slot-editor${dragOverSlotIndex === index ? ' drag-over' : ''}`} key={`${slot.id ?? 'new'}-${index}`} onDragOver={(event) => { event.preventDefault(); setDragOverSlotIndex(index); }} onDrop={(event) => { event.preventDefault(); if (draggedSlotIndex !== null) reorderSlot(draggedSlotIndex, index); }}><button type="button" className="slot-drag-handle" draggable aria-label={`Pindahkan slot ${index + 1}`} onDragStart={() => { setDraggedSlotIndex(index); setDragOverSlotIndex(index); }} onDragEnd={() => { setDraggedSlotIndex(null); setDragOverSlotIndex(null); }}>⋮⋮</button><input aria-label={`Label slot ${index + 1}`} value={slot.label} placeholder="Label, misalnya Pagi" onChange={(event) => change({ slots: (form.slots ?? []).map((item) => item === slot ? { ...item, label: event.target.value } : item) })} /><div className="slot-editor-meta"><TimeField ariaLabel={`Jam slot ${index + 1}`} value={slot.local_time} onChange={(value) => change({ slots: (form.slots ?? []).map((item) => item === slot ? { ...item, local_time: value } : item) })} /><div className="slot-row-actions"><button type="button" className="slot-move" aria-label={`Naikkan slot ${index + 1}`} disabled={index === 0} onClick={() => moveSlot(index, -1)}>↑</button><button type="button" className="slot-move" aria-label={`Turunkan slot ${index + 1}`} disabled={index === activeSlots.length - 1} onClick={() => moveSlot(index, 1)}>↓</button>{activeSlots.length > 1 && <ConfirmActionButton className="icon-button" label="×" title="Hapus slot waktu?" description="Slot ini hanya dihapus dari rancangan jadwal saat ini. Simpan perubahan jika ingin menerapkannya." confirmLabel="Hapus slot" pending={false} onConfirm={() => change({ slots: (form.slots ?? []).filter((item) => item.id || item !== slot).map((item, itemIndex) => item === slot ? { ...item, is_active: false } : { ...item, sort_order: itemIndex }) })} />}</div></div></div>)}<button type="button" className="secondary add-slot" onClick={() => change({ slots: [...(form.slots ?? []), { label: '', local_time: '12:00', sort_order: form.slots?.length ?? 0, is_active: true }] })}>＋ Tambah slot</button></fieldset>
        <div className="schedule-date-grid"><label>Mulai<DateInput required value={form.start_date} onChange={(event) => change({ start_date: event.target.value })} /></label><label>Tanggal berakhir<DateInput required value={form.end_date ?? ''} onChange={(event) => change({ end_date: event.target.value })} /><small className="field-hint">Rentang tanggal tugas. Tanggal berakhir dapat diubah dan terpisah dari frekuensi pengulangan.</small></label></div>
        <fieldset className="recurrence-fieldset"><legend>Frekuensi pengulangan</legend><p className="field-hint">Untuk tugas setiap hari selama satu bulan, pilih <b>1 Hari</b>, lalu isi tanggal berakhir satu bulan dari tanggal mulai.</p><div className="schedule-recurrence-grid"><label>Ulangi setiap<input aria-label="Jumlah interval" type="number" min="1" step="1" value={form.repeat_interval} onChange={(event) => change({ repeat_interval: Number(event.target.value) })} /></label><label>Satuan<select aria-label="Satuan interval" value={form.repeat_unit} onChange={(event) => change({ repeat_unit: event.target.value as ScheduleInput['repeat_unit'] })}><option value="day">Hari</option><option value="week">Minggu</option><option value="month">Bulan</option></select></label></div>{form.repeat_unit === 'week' && <div className="weekday-picker"><span>Hari dalam minggu</span><div>{weekdays.map((day) => <button type="button" key={day.value} className={(form.days_of_week ?? []).includes(day.value) ? 'active' : ''} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></div>}{form.repeat_unit === 'month' && <div className="schedule-recurrence-grid"><label>Hari dalam bulan<input type="number" min="1" max="31" value={form.day_of_month ?? ''} disabled={form.last_day} onChange={(event) => change({ day_of_month: event.target.value ? Number(event.target.value) : null })} /></label><label className="checkbox-label"><input type="checkbox" checked={Boolean(form.last_day)} onChange={(event) => change({ last_day: event.target.checked, day_of_month: event.target.checked ? null : form.day_of_month })} /> Hari terakhir</label></div>}</fieldset>
        <fieldset className="recurrence-fieldset"><legend>Target</legend><p className="field-hint">Kosongkan pilihan untuk menerapkan ke seluruh household.</p><div className="target-options">{(options.data?.cats ?? []).map((cat) => <label className="checkbox-label" key={cat.id}><input type="checkbox" checked={(form.targets ?? []).some((target) => target.target_key === `cat:${cat.id}`)} onChange={() => toggleTarget({ target_key: `cat:${cat.id}`, cat_id: cat.id, litter_box_id: null })} /> Kucing: {cat.name}</label>)}{(options.data?.litterBoxes ?? []).map((box) => <label className="checkbox-label" key={box.id}><input type="checkbox" checked={(form.targets ?? []).some((target) => target.target_key === `litter:${box.id}`)} onChange={() => toggleTarget({ target_key: `litter:${box.id}`, cat_id: null, litter_box_id: box.id })} /> Litter box: {box.name}</label>)}</div></fieldset>
         <div className="form-actions"><button className="primary" type="submit" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Simpan jadwal'}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(blankFor(timezone)); setFormError(null); }}>Batal</button>}</div>
      </form>
      <div className="schedule-results">{statusFilter === 'archived' && visibleSchedules.length > 0 && <section className="schedule-restore-panel"><div><p className="eyebrow">ARSIP JADWAL</p><h3>Pulihkan jadwal</h3><p>Pulihkan jadwal arsip untuk mengaktifkannya kembali dan membuat checklist sesuai tanggal.</p></div><div className="schedule-restore-list">{visibleSchedules.map((item) => <button className="schedule-restore-button" type="button" key={item.id} disabled={restore.isPending} onClick={() => restore.mutate(item.id)}><span>Pulihkan</span><strong>{item.title}</strong></button>)}</div></section>}
        <section className="panel"><div className="section-heading"><div><p className="eyebrow">CHECKLIST</p><h2>Timeline checklist</h2></div><span className="date-label">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: timezone }).format(new Date())}</span></div><div className="schedule-filter-tabs" role="tablist" aria-label="Rentang checklist">{filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><ChecklistTimeline occurrences={occurrences.data ?? []} timezone={timezone} targetNames={targetNames} onComplete={(id) => complete.mutate({ occurrenceId: id })} onArchive={(id) => archiveOccurrence.mutate(id)} busy={complete.isPending || archiveOccurrence.isPending} /></section>
        <section className="panel"><div className="section-heading"><div><p className="eyebrow">KONFIGURASI</p><h2>{statusFilter === 'archived' ? 'Arsip jadwal' : 'Semua jadwal'}</h2></div><span className="count-badge">{visibleSchedules.length}</span></div><div className="schedule-filter-tabs schedule-status-tabs" role="tablist" aria-label="Status jadwal">{([{ value: 'active', label: 'Aktif' }, { value: 'paused', label: 'Dijeda' }, { value: 'archived', label: 'Arsip' }, { value: 'all', label: 'Semua' }] as const).map((item) => <button key={item.value} type="button" role="tab" aria-selected={statusFilter === item.value} className={statusFilter === item.value ? 'active' : ''} onClick={() => setStatusFilter(item.value)}>{item.label}</button>)}</div>{visibleSchedules.length ? <div className="data-list schedule-responsive-list">{visibleSchedules.map((item) => <div className="data-row schedule-list-row" key={item.id}><div><b>{item.title}</b><span className="schedule-custom-category">{item.category === 'other' ? item.custom_category || 'Lainnya' : item.category === 'feeding' ? 'Makan' : item.category === 'litter' ? 'Litter box' : 'Obat'}</span><small>{item.slots.map((slot) => `${slot.label || 'Slot'} ${slot.local_time.slice(0, 5)}`).join(' · ')} · {item.repeat_interval} {item.repeat_unit} · {item.start_date} sampai {item.end_date ?? 'tanpa batas'}</small><span className={`schedule-status status-${item.status}`}>{item.status === 'active' ? 'Aktif' : item.status === 'paused' ? 'Dijeda' : 'Diarsipkan'}</span></div><div className="row-actions">{item.status !== 'archived' && <button className="row-action" type="button" onClick={() => edit(item)}>Edit</button>}{item.status === 'active' && <button className="row-action" type="button" disabled={pause.isPending} onClick={() => pause.mutate(item.id)}>Jeda</button>}{item.status === 'paused' && <button className="row-action" type="button" disabled={resume.isPending} onClick={() => resume.mutate(item.id)}>Lanjutkan</button>}{item.status !== 'archived' && <ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan jadwal?" description={`Jadwal "${item.title}" akan dipindahkan ke arsip.`} confirmLabel="Arsipkan jadwal" pending={archive.isPending} onConfirm={() => archive.mutate(item.id)} />}{item.status !== 'archived' && <ConfirmActionButton label="Hapus permanen" title="Hapus jadwal secara permanen?" description={`Jadwal "${item.title}" akan dihapus. Jika memiliki histori, sistem akan tetap menjaga histori tersebut.`} confirmLabel="Hapus permanen" pending={remove.isPending} onConfirm={() => remove.mutate(item.id)} />}{item.status === 'archived' && <ConfirmActionButton className="row-action" label="Hapus permanen" title="Hapus jadwal arsip?" description={`Jadwal "${item.title}" akan dihapus permanen dari arsip.`} confirmLabel="Hapus jadwal" pending={remove.isPending} onConfirm={() => remove.mutate(item.id)} />}</div></div>)}</div> : <div className="empty small"><span>{statusFilter === 'archived' ? '▣' : '＋'}</span><p>{statusFilter === 'archived' ? 'Belum ada jadwal yang diarsipkan.' : 'Belum ada jadwal pada filter ini.'}</p></div>}</section>
      </div>
    </div>
  </section>;
}
