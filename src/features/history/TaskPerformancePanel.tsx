import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Users } from 'lucide-react';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { householdToday, shiftLocalDate } from '../../lib/timezone';
import { DateInput } from '../../components/DateInput';
import { QueryState } from '../../components/QueryState';

export type TaskPerformanceRow = {
  occurrence_id: string;
  schedule_id: string;
  schedule_title: string;
  category: string;
  custom_category: string | null;
  slot_label: string | null;
  target_key: string;
  target_label: string;
  local_date: string;
  scheduled_at: string;
  assigned_key: string;
  assigned_label: string;
  assigned_user_id: string | null;
  assignee_id: string | null;
  completed_by: string | null;
  completed_by_label: string | null;
  completed_at: string | null;
  archived_at: string | null;
  note: string;
  status: 'completed' | 'missed' | 'pending' | 'skipped';
  delay_minutes: number;
};

type StatusFilter = 'all' | TaskPerformanceRow['status'];
type MemberSummary = { key: string; label: string; assigned: number; completed: number; missed: number; pending: number; skipped: number; completionRate: number | null };

const categoryLabels: Record<string, string> = { feeding: 'Makan', litter: 'Litter box', medicine: 'Obat', other: 'Lainnya' };
const statusLabels: Record<TaskPerformanceRow['status'], string> = { completed: 'Selesai', missed: 'Terlewat', pending: 'Belum jatuh tempo', skipped: 'Dilewati' };

function categoryLabel(row: TaskPerformanceRow) {
  return row.category === 'other' && row.custom_category?.trim() ? row.custom_category.trim() : categoryLabels[row.category] ?? row.category;
}

function statusLabel(status: TaskPerformanceRow['status']) {
  return statusLabels[status] ?? status;
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

function formatDelay(minutes: number) {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} menit terlambat`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} jam ${remaining} menit terlambat` : `${hours} jam terlambat`;
}

function summarize(rows: TaskPerformanceRow[]) {
  const map = new Map<string, MemberSummary>();
  for (const row of rows) {
    const current = map.get(row.assigned_key) ?? { key: row.assigned_key, label: row.assigned_label, assigned: 0, completed: 0, missed: 0, pending: 0, skipped: 0, completionRate: null };
    current.assigned += 1;
    if (row.status === 'completed') current.completed += 1;
    if (row.status === 'missed') current.missed += 1;
    if (row.status === 'pending') current.pending += 1;
    if (row.status === 'skipped') current.skipped += 1;
    map.set(row.assigned_key, current);
  }
  return [...map.values()].map((item) => ({ ...item, completionRate: item.completed + item.missed ? Math.round((item.completed / (item.completed + item.missed)) * 100) : null })).sort((left, right) => right.missed - left.missed || right.assigned - left.assigned || left.label.localeCompare(right.label, 'id'));
}

export function TaskPerformancePanel({ household, canView }: { household: Household; canView: boolean }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [range, setRange] = useState(() => { const toDate = householdToday(timezone); return { fromDate: shiftLocalDate(toDate, -30), toDate }; });
  const [memberFilter, setMemberFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const performance = useQuery({
    queryKey: ['task-performance', household.id, range, timezone],
    enabled: Boolean(supabase && canView && range.fromDate && range.toDate && range.fromDate <= range.toDate),
    queryFn: async (): Promise<TaskPerformanceRow[]> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.rpc('household_task_performance', {
        requested_household_id: household.id,
        from_date: range.fromDate,
        to_date: range.toDate,
        timezone_value: timezone,
      });
      if (error) throw error;
      return (data ?? []) as TaskPerformanceRow[];
    },
  });
  const rows = performance.data ?? [];
  const memberOptions = useMemo(() => [...new Map(rows.map((row) => [row.assigned_key, row.assigned_label])).entries()].sort((left, right) => left[1].localeCompare(right[1], 'id')), [rows]);
  const categoryOptions = useMemo(() => [...new Set(rows.map((row) => row.category))].sort((left, right) => (categoryLabels[left] ?? left).localeCompare(categoryLabels[right] ?? right, 'id')), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => (!memberFilter || row.assigned_key === memberFilter) && (statusFilter === 'all' || row.status === statusFilter) && (categoryFilter === 'all' || row.category === categoryFilter)), [rows, memberFilter, statusFilter, categoryFilter]);
  const memberSummary = useMemo(() => summarize(filteredRows), [filteredRows]);
  const metrics = useMemo(() => ({
    total: filteredRows.length,
    completed: filteredRows.filter((row) => row.status === 'completed').length,
    missed: filteredRows.filter((row) => row.status === 'missed').length,
    pending: filteredRows.filter((row) => row.status === 'pending').length,
    averageDelay: (() => { const delayed = filteredRows.filter((row) => row.status === 'completed' && row.delay_minutes > 0); return delayed.length ? Math.round(delayed.reduce((sum, row) => sum + row.delay_minutes, 0) / delayed.length) : 0; })(),
  }), [filteredRows]);
  const missedRows = filteredRows.filter((row) => row.status === 'missed').slice(0, 8);

  function resetFilters() {
    const toDate = householdToday(timezone);
    setRange({ fromDate: shiftLocalDate(toDate, -30), toDate });
    setMemberFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  if (!canView) return <section className="panel task-performance-access" role="note"><Users size={22} /><div><h2>Rekap pengerjaan untuk owner/admin</h2><p>Rekap ini menampilkan performa seluruh anggota rumah. Aksesnya dibatasi agar histori aktivitas tetap aman.</p></div></section>;

  return <section className="task-performance" aria-label="Kinerja tugas">
    <div className="performance-intro"><div><p className="eyebrow">REKAP OPERASIONAL</p><h2>Kinerja pengerjaan tugas</h2><p>Lihat siapa yang ditugaskan, siapa yang menyelesaikan, dan tugas yang masih terlewat. Status dihitung dari jadwal tersimpan.</p></div><span className="performance-source"><ClipboardCheck size={16} /> Supabase · occurrence</span></div>
    <div className="history-filters performance-filters" aria-label="Filter kinerja tugas"><label>Dari<DateInput value={range.fromDate} onChange={(event) => setRange((current) => ({ ...current, fromDate: event.target.value }))} /></label><label>Sampai<DateInput value={range.toDate} onChange={(event) => setRange((current) => ({ ...current, toDate: event.target.value }))} /></label><label>Petugas<select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="">Semua petugas</option>{memberOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Kategori<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Semua kategori</option>{categoryOptions.map((value) => <option key={value} value={value}>{categoryLabels[value] ?? value}</option>)}</select></label><button type="button" className="text-action" onClick={resetFilters}>Reset filter</button></div>
    <QueryState loading={performance.isLoading} error={performance.error} onRetry={() => void performance.refetch()}>
      {!range.fromDate || !range.toDate || range.fromDate > range.toDate ? <section className="panel query-state" role="alert"><p>Rentang tanggal tidak valid. Pastikan tanggal mulai tidak melewati tanggal akhir.</p></section> : filteredRows.length === 0 ? <section className="panel empty performance-empty"><ClipboardCheck /><h2>Belum ada tugas di rentang ini</h2><p>Periksa filter atau pastikan jadwal sudah dibuat di household.</p></section> : <>
        <div className="performance-metrics"><div className="performance-metric"><span>Total tugas</span><strong>{metrics.total}</strong><small>sesuai filter</small></div><div className="performance-metric performance-metric-success"><span>Selesai</span><strong>{metrics.completed}</strong><small>{metrics.total ? `${Math.round((metrics.completed / metrics.total) * 100)}% dari semua tugas` : '—'}</small></div><div className="performance-metric performance-metric-danger"><span>Terlewat</span><strong>{metrics.missed}</strong><small>perlu ditindaklanjuti</small></div><div className="performance-metric performance-metric-warning"><span>Belum jatuh tempo</span><strong>{metrics.pending}</strong><small>{metrics.averageDelay ? `Rata-rata terlambat ${formatDelay(metrics.averageDelay)}` : 'Belum ada keterlambatan'}</small></div></div>
        <div className="performance-overview-grid"><section className="panel performance-members"><div className="performance-section-heading"><div><p className="eyebrow">PER ANGGOTA</p><h2>Ringkasan petugas</h2></div><span>{memberSummary.length} petugas</span></div><div className="performance-member-list">{memberSummary.map((member) => <article className="performance-member-row" key={member.key}><div className="performance-member-name"><span className="performance-avatar"><Users size={16} /></span><div><strong>{member.label}</strong><small>{member.assigned} tugas ditugaskan</small></div></div><div className="performance-member-stats"><span className="success-text">{member.completed} selesai</span><span className="danger-text">{member.missed} terlewat</span><span>{member.pending} menunggu</span></div><div className="performance-member-rate">{member.completionRate === null ? '—' : `${member.completionRate}%`}<small>tingkat selesai</small></div></article>)}</div></section><section className="panel performance-exceptions"><div className="performance-section-heading"><div><p className="eyebrow">PERLU PERHATIAN</p><h2>Tugas terlewat</h2></div><AlertTriangle size={19} /></div>{missedRows.length ? <div className="performance-exception-list">{missedRows.map((row) => <article key={row.occurrence_id}><span className="performance-exception-icon"><AlertTriangle size={15} /></span><div><strong>{row.schedule_title}</strong><small>{row.target_label} · {row.assigned_label}</small><small>{formatDate(row.local_date, timezone)} · dijadwalkan {formatTime(row.scheduled_at, timezone)}</small></div></article>)}</div> : <div className="performance-no-exceptions"><CheckCircle2 /><p>Tidak ada tugas terlewat pada filter ini.</p></div>}</section></div>
        <section className="panel performance-detail"><div className="performance-section-heading"><div><p className="eyebrow">DETAIL TUGAS</p><h2>Aktivitas pengerjaan</h2></div><span>{filteredRows.length} baris</span></div><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Tanggal</th><th>Tugas & target</th><th>Petugas</th><th>Status</th><th>Dikerjakan oleh</th><th>Catatan</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.occurrence_id}><td><strong>{formatDate(row.local_date, timezone)}</strong><small>{formatTime(row.scheduled_at, timezone)}</small></td><td><strong>{row.schedule_title}</strong><small>{categoryLabel(row)} · {row.target_label}{row.slot_label ? ` · ${row.slot_label}` : ''}</small></td><td><span className="performance-person">{row.assigned_label}</span></td><td><span className={`performance-status performance-status-${row.status}`}>{statusLabel(row.status)}</span>{row.delay_minutes > 0 && <small className="performance-delay">{formatDelay(row.delay_minutes)}</small>}</td><td>{row.completed_by_label ? <span className={row.completed_by !== row.assigned_user_id ? 'performance-other-doer' : ''}>{row.completed_by_label}{row.completed_by !== row.assigned_user_id && <small>Dikerjakan orang lain</small>}</span> : <span className="muted-text">Belum ada</span>}</td><td>{row.note?.trim() ? <span className="performance-note">{row.note}</span> : <span className="muted-text">—</span>}</td></tr>)}</tbody></table></div></section>
      </>}
    </QueryState>
  </section>;
}
