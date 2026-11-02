import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Archive, CheckCircle2, Download, Settings2, Trash2, Users } from 'lucide-react';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { PageSkeleton } from '../../components/Skeleton';
import { TaskPerformancePanel } from './TaskPerformancePanel';

type AuditEvent = { id: string; actor_id: string | null; actor_name: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string };
type Actor = { id: string; full_name: string | null };
const PAGE_SIZE = 25;
const actionLabels: Record<string, string> = { completed: 'Tugas diselesaikan', deleted: 'Data dihapus', archived: 'Data diarsipkan', updated: 'Data diperbarui', created: 'Data dibuat', insert: 'Data dibuat', cleaned: 'Litter box dibersihkan', stock_moved: 'Stok diperbarui', role_changed: 'Role anggota berubah', removed: 'Anggota dicabut', invitation_accepted: 'Undangan diterima', invitation_declined: 'Undangan ditolak', invitation_revoked: 'Undangan dicabut', user_deleted: 'Akun dihapus' };
const entityLabels: Record<string, string> = { schedule_occurrence: 'Tugas jadwal', schedule: 'Jadwal', schedule_rotation: 'Rotasi petugas', cat: 'Kucing', litter_box: 'Litter box', catalog_item: 'Katalog', cat_health_record: 'Riwayat kesehatan', cat_vaccination: 'Vaksinasi', cat_food_profile: 'Profil makanan', cat_expense: 'Pengeluaran', cat_attachment: 'Lampiran', cat_scan_record: 'Hasil scan', food_product: 'Produk makanan', household_member: 'Anggota household', household_invitation: 'Undangan household' };
const changedFieldLabels: Record<string, string> = { name: 'nama', title: 'judul', category: 'kategori', status: 'status', is_active: 'status aktif', stock_quantity: 'jumlah stok', stock_unit: 'satuan stok' };

export function formatAuditAction(action: string) { return actionLabels[action] ?? action.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
export function formatEntityType(entityType: string) { return entityLabels[entityType] ?? entityType.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function readableValue(value: unknown) { if (value === null || value === undefined || value === '') return 'kosong'; if (typeof value === 'boolean') return value ? 'aktif' : 'nonaktif'; return String(value); }
function changedFieldsDescription(value: unknown) {
  if (!isRecord(value)) return '';
  return Object.entries(value).map(([field, change]) => {
    if (!isRecord(change)) return changedFieldLabels[field] ?? field;
    return `${changedFieldLabels[field] ?? field}: ${readableValue(change.before)} → ${readableValue(change.after)}`;
  }).join(' · ');
}
function eventDescription(event: AuditEvent) {
  const metadata = event.metadata ?? {};
  const displayName = typeof metadata.display_name === 'string' ? metadata.display_name : '';
  if (event.action === 'completed' && event.entity_type === 'schedule_occurrence') { const task = [metadata.schedule_title, metadata.target_label].filter((value): value is string => typeof value === 'string' && Boolean(value)).join(' · '); return task ? `Checklist “${task}” dicatat sebagai selesai.` : 'Checklist perawatan dicatat sebagai selesai.'; }
  if (event.action === 'cleaned') return displayName ? `Kebersihan “${displayName}” dicatat sebagai selesai.` : 'Waktu kebersihan litter box dicatat dan statusnya menjadi bersih.';
  if (event.action === 'stock_moved') { const movement = typeof metadata.movement_type === 'string' ? metadata.movement_type : 'pergerakan'; const quantity = metadata.quantity !== undefined ? ` · jumlah ${readableValue(metadata.quantity)}` : ''; return `${displayName ? `Stok “${displayName}”` : 'Pergerakan stok'} ${movement}${quantity}.`; }
  if (event.action === 'deleted') return displayName ? `“${displayName}” dihapus dari household.` : 'Data ini dihapus dari household.';
  if (event.action === 'archived') return displayName ? `“${displayName}” dipindahkan ke arsip dan tetap tersimpan di histori.` : 'Data dipindahkan ke arsip dan tetap tersimpan di histori.';
  if (event.action === 'created' || event.action === 'insert') return displayName ? `“${displayName}” dibuat di household.` : 'Data baru dibuat di household.';
  if (event.action === 'updated' && changedFieldsDescription(metadata.changed_fields)) return `${displayName ? `“${displayName}”` : 'Data'} diperbarui: ${changedFieldsDescription(metadata.changed_fields)}.`;
  if (event.entity_type === 'schedule_rotation') return 'Aturan petugas global household diperbarui.';
  if (event.action === 'invitation_accepted') return 'Undangan household diterima dan akses anggota dibuat.';
  if (event.action === 'invitation_declined') return 'Undangan household ditolak.';
  if (event.action === 'invitation_revoked') return 'Undangan household dicabut sebelum digunakan.';
  return 'Perubahan ini tercatat di audit household.';
}
function EventIcon({ action, entityType }: { action: string; entityType: string }) { if (action === 'completed' || action === 'cleaned') return <CheckCircle2 />; if (action === 'deleted') return <Trash2 />; if (action === 'archived') return <Archive />; if (action === 'updated' && entityType === 'schedule_rotation') return <Users />; if (action === 'updated') return <Settings2 />; return <Activity />; }
function actorLabel(event: AuditEvent, actorNames: Map<string, string>) { return event.actor_name?.trim() || (event.actor_id ? actorNames.get(event.actor_id) ?? 'Anggota household' : 'Akun dihapus'); }
function boundary(value: string, timezone: string, end: boolean) { const offset = timezone === 'Asia/Jayapura' ? '+09:00' : timezone === 'Asia/Makassar' ? '+08:00' : '+07:00'; return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}${offset}`).toISOString(); }
function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function HistoryPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [view, setView] = useState<'audit' | 'performance'>('audit');
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = { actionFilter, entityFilter, actorFilter, fromDate, toDate };
  const access = useQuery({
    queryKey: ['household-access', household.id],
    enabled: Boolean(supabase),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.rpc('household_access', { requested_household_id: household.id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const history = useQuery({
    queryKey: ['history', household.id, page, filters],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<{ data: AuditEvent[]; count: number }> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      let query = supabase.from('audit_events').select('*', { count: 'exact' }).eq('household_id', household.id).order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (actionFilter) query = query.eq('action', actionFilter);
      if (entityFilter) query = query.eq('entity_type', entityFilter);
      if (actorFilter) query = query.eq('actor_id', actorFilter);
      if (fromDate) query = query.gte('created_at', boundary(fromDate, timezone, false));
      if (toDate) query = query.lte('created_at', boundary(toDate, timezone, true));
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as AuditEvent[], count: count ?? 0 };
    },
  });
  const members = useQuery({
    queryKey: ['history-actors', household.id],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Actor[]> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data: membershipRows, error: membershipError } = await supabase.from('household_members').select('user_id').eq('household_id', household.id).eq('is_active', true);
      if (membershipError) throw membershipError;
      const ids = (membershipRows ?? []).map((row) => row.user_id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', ids).order('full_name');
      if (error) throw error;
      return (data ?? []) as Actor[];
    },
  });
  const actorNames = useMemo(() => new Map((members.data ?? []).map((actor: Actor) => [actor.id, actor.full_name?.trim() || 'Anggota household'])), [members.data]);
  const totalPages = Math.max(1, Math.ceil((history.data?.count ?? 0) / PAGE_SIZE));

  function resetFilters() { setPage(0); setActionFilter(''); setEntityFilter(''); setActorFilter(''); setFromDate(''); setToDate(''); }
  async function downloadCsv() {
    if (!supabase) return;
    let query = supabase.from('audit_events').select('*').eq('household_id', household.id).order('created_at', { ascending: false });
    if (actionFilter) query = query.eq('action', actionFilter);
    if (entityFilter) query = query.eq('entity_type', entityFilter);
    if (actorFilter) query = query.eq('actor_id', actorFilter);
    if (fromDate) query = query.gte('created_at', boundary(fromDate, timezone, false));
    if (toDate) query = query.lte('created_at', boundary(toDate, timezone, true));
    const { data, error } = await query;
    if (error) return;
    const rows = (data ?? []) as AuditEvent[];
    const csv = [['Waktu', 'Aksi', 'Entitas', 'Actor', 'Detail', 'Entity ID'].map(csvCell).join(','), ...rows.map((event) => [event.created_at, formatAuditAction(event.action), formatEntityType(event.entity_type), actorLabel(event, actorNames), eventDescription(event), event.entity_id ?? ''].map(csvCell).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `meowku-histori-${household.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (history.isLoading) return <PageSkeleton />;
  if (history.error) return <section className="panel entity-page"><p role="alert">{history.error.message}</p></section>;
  return <section className="entity-page history-page">
    <PageHeader eyebrow="MEOWKU / HISTORI" title="Histori aktivitas" description="Audit perubahan household dan rekap pengerjaan tugas dalam satu tempat." />
    <div className="history-view-tabs" role="tablist" aria-label="Jenis histori"><button type="button" role="tab" aria-selected={view === 'audit'} className={view === 'audit' ? 'active' : ''} onClick={() => setView('audit')}>Audit perubahan</button><button type="button" role="tab" aria-selected={view === 'performance'} className={view === 'performance' ? 'active' : ''} onClick={() => setView('performance')}>Kinerja tugas</button></div>
    {view === 'performance' ? access.isLoading ? <PageSkeleton /> : access.error ? <section className="panel query-state" role="alert"><p>Akses rekap belum dapat diverifikasi. Coba lagi.</p></section> : <TaskPerformancePanel household={household} canView={access.data?.can_view_audit === true} /> : <section className="panel history-panel">
      <div className="history-panel-heading"><div><p className="eyebrow">AUDIT APPEND-ONLY</p><h2>Aktivitas household</h2><p className="history-panel-subtitle">Catatan perubahan tidak dapat diubah atau dihapus.</p></div><div className="history-toolbar"><span className="count-badge">{history.data?.count ?? 0} aktivitas</span><button type="button" className="secondary" onClick={() => void downloadCsv()}><Download size={15} /> Export CSV</button></div></div>
      <div className="history-filters" aria-label="Filter histori"><label>Aksi<select value={actionFilter} onChange={(event) => { setPage(0); setActionFilter(event.target.value); }}><option value="">Semua aksi</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Entitas<select value={entityFilter} onChange={(event) => { setPage(0); setEntityFilter(event.target.value); }}><option value="">Semua entitas</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Actor<select value={actorFilter} onChange={(event) => { setPage(0); setActorFilter(event.target.value); }}><option value="">Semua anggota</option>{(members.data ?? []).map((actor: Actor) => <option key={actor.id} value={actor.id}>{actor.full_name?.trim() || 'Anggota household'}</option>)}</select></label><label>Dari<input type="date" value={fromDate} onChange={(event) => { setPage(0); setFromDate(event.target.value); }} /></label><label>Sampai<input type="date" value={toDate} onChange={(event) => { setPage(0); setToDate(event.target.value); }} /></label><button type="button" className="text-action" onClick={resetFilters}>Reset filter</button></div>
      {history.data?.data.length ? <div className="history-timeline">{history.data.data.map((event: AuditEvent) => <article className={`history-event history-event-${event.action}`} key={event.id}><div className="history-event-icon"><EventIcon action={event.action} entityType={event.entity_type} /></div><div className="history-event-body"><div className="history-event-top"><div className="history-event-label"><strong>{formatAuditAction(event.action)}</strong><span>{formatEntityType(event.entity_type)}</span></div><time dateTime={event.created_at}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(event.created_at))}</time></div><p>{eventDescription(event)}</p><div className="history-event-meta"><span>Oleh <b>{actorLabel(event, actorNames)}</b></span>{event.entity_id && <span className="history-event-id">ID tersimpan</span>}</div></div></article>)}</div> : <div className="empty"><Activity /><h2>Belum ada histori</h2><p>Aktivitas sesuai filter akan muncul di sini.</p></div>}
      <div className="history-pagination"><button type="button" className="secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Sebelumnya</button><span>Halaman {Math.min(page + 1, totalPages)} dari {totalPages}</span><button type="button" className="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>Berikutnya</button></div>
    </section>}
  </section>;
}
