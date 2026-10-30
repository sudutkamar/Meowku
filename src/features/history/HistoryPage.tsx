import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Archive, CheckCircle2, Download, Settings2, Trash2, Users } from 'lucide-react';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { PageSkeleton } from '../../components/Skeleton';

type AuditEvent = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string };
type Actor = { id: string; full_name: string | null };
const PAGE_SIZE = 25;
const actionLabels: Record<string, string> = { completed: 'Tugas diselesaikan', deleted: 'Data dihapus', archived: 'Data diarsipkan', updated: 'Data diperbarui', created: 'Data dibuat', cleaned: 'Litter box dibersihkan', stock_moved: 'Stok diperbarui', role_changed: 'Role anggota berubah', removed: 'Anggota dicabut' };
const entityLabels: Record<string, string> = { schedule_occurrence: 'Tugas jadwal', schedule: 'Jadwal', schedule_rotation: 'Rotasi petugas', cat: 'Kucing', litter_box: 'Litter box', catalog_item: 'Katalog', cat_health_record: 'Riwayat kesehatan', cat_vaccination: 'Vaksinasi', cat_food_profile: 'Profil makanan', cat_expense: 'Pengeluaran', household_member: 'Anggota household' };

export function formatAuditAction(action: string) { return actionLabels[action] ?? action.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
export function formatEntityType(entityType: string) { return entityLabels[entityType] ?? entityType.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
function eventDescription(event: AuditEvent) {
  if (event.action === 'completed' && event.entity_type === 'schedule_occurrence') return 'Checklist perawatan dicatat sebagai selesai.';
  if (event.action === 'cleaned') return 'Waktu kebersihan litter box dicatat dan statusnya menjadi bersih.';
  if (event.action === 'stock_moved') return 'Pergerakan stok dicatat dan saldo divalidasi di database.';
  if (event.action === 'deleted') return 'Data ini dihapus dari household.';
  if (event.action === 'archived') return 'Data dipindahkan ke arsip dan tetap tersimpan di histori.';
  if (event.entity_type === 'schedule_rotation') return 'Aturan petugas global household diperbarui.';
  return 'Perubahan ini tercatat di audit household.';
}
function EventIcon({ action, entityType }: { action: string; entityType: string }) { if (action === 'completed' || action === 'cleaned') return <CheckCircle2 />; if (action === 'deleted') return <Trash2 />; if (action === 'archived') return <Archive />; if (action === 'updated' && entityType === 'schedule_rotation') return <Users />; if (action === 'updated') return <Settings2 />; return <Activity />; }
function boundary(value: string, timezone: string, end: boolean) { const offset = timezone === 'Asia/Jayapura' ? '+09:00' : timezone === 'Asia/Makassar' ? '+08:00' : '+07:00'; return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}${offset}`).toISOString(); }
function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function HistoryPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = { actionFilter, entityFilter, actorFilter, fromDate, toDate };
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
    const csv = [['Waktu', 'Aksi', 'Entitas', 'Actor', 'Entity ID'].map(csvCell).join(','), ...rows.map((event) => [event.created_at, formatAuditAction(event.action), formatEntityType(event.entity_type), event.actor_id ? actorNames.get(event.actor_id) ?? 'Anggota household' : 'Akun dihapus', event.entity_id ?? ''].map(csvCell).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `meowku-histori-${household.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (history.isLoading) return <PageSkeleton />;
  if (history.error) return <section className="panel entity-page"><p role="alert">{history.error.message}</p></section>;
  return <section className="entity-page history-page">
    <PageHeader eyebrow="MEOWKU / HISTORI" title="Histori aktivitas" description="Catatan perubahan household yang tidak dapat diubah atau dihapus." />
    <section className="panel history-panel">
      <div className="history-panel-heading"><div><p className="eyebrow">RIWAYAT</p><h2>Aktivitas household</h2></div><div className="history-toolbar"><span className="count-badge">{history.data?.count ?? 0} aktivitas</span><button type="button" className="secondary" onClick={() => void downloadCsv()}><Download size={15} /> Export CSV</button></div></div>
      <div className="history-filters" aria-label="Filter histori"><label>Aksi<select value={actionFilter} onChange={(event) => { setPage(0); setActionFilter(event.target.value); }}><option value="">Semua aksi</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Entitas<select value={entityFilter} onChange={(event) => { setPage(0); setEntityFilter(event.target.value); }}><option value="">Semua entitas</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Actor<select value={actorFilter} onChange={(event) => { setPage(0); setActorFilter(event.target.value); }}><option value="">Semua anggota</option>{(members.data ?? []).map((actor: Actor) => <option key={actor.id} value={actor.id}>{actor.full_name?.trim() || 'Anggota household'}</option>)}</select></label><label>Dari<input type="date" value={fromDate} onChange={(event) => { setPage(0); setFromDate(event.target.value); }} /></label><label>Sampai<input type="date" value={toDate} onChange={(event) => { setPage(0); setToDate(event.target.value); }} /></label><button type="button" className="text-action" onClick={resetFilters}>Reset filter</button></div>
      {history.data?.data.length ? <div className="history-timeline">{history.data.data.map((event: AuditEvent) => <article className={`history-event history-event-${event.action}`} key={event.id}><div className="history-event-icon"><EventIcon action={event.action} entityType={event.entity_type} /></div><div className="history-event-body"><div className="history-event-top"><div className="history-event-label"><strong>{formatAuditAction(event.action)}</strong><span>{formatEntityType(event.entity_type)}</span></div><time dateTime={event.created_at}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(event.created_at))}</time></div><p>{eventDescription(event)}</p><div className="history-event-meta"><span>Oleh <b>{event.actor_id ? actorNames.get(event.actor_id) ?? 'Anggota household' : 'Akun dihapus'}</b></span>{event.entity_id && <span className="history-event-id">ID tersimpan</span>}</div></div></article>)}</div> : <div className="empty"><Activity /><h2>Belum ada histori</h2><p>Aktivitas sesuai filter akan muncul di sini.</p></div>}
      <div className="history-pagination"><button type="button" className="secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Sebelumnya</button><span>Halaman {Math.min(page + 1, totalPages)} dari {totalPages}</span><button type="button" className="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>Berikutnya</button></div>
    </section>
  </section>;
}
