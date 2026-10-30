import { useQuery } from '@tanstack/react-query';
import { Activity, Archive, CheckCircle2, Settings2, Trash2, Users } from 'lucide-react';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { PageSkeleton } from '../../components/Skeleton';

type AuditEvent = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string };

const actionLabels: Record<string, string> = {
  completed: 'Tugas diselesaikan',
  deleted: 'Data dihapus',
  archived: 'Data diarsipkan',
  updated: 'Data diperbarui',
  created: 'Data dibuat',
};

const entityLabels: Record<string, string> = {
  schedule_occurrence: 'Tugas jadwal',
  schedule: 'Jadwal',
  schedule_rotation: 'Rotasi petugas',
  cat: 'Kucing',
  litter_box: 'Litter box',
  catalog_item: 'Katalog',
};

export function formatAuditAction(action: string) {
  return actionLabels[action] ?? action.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export function formatEntityType(entityType: string) {
  return entityLabels[entityType] ?? entityType.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function eventDescription(event: AuditEvent) {
  if (event.action === 'completed' && event.entity_type === 'schedule_occurrence') return 'Checklist perawatan dicatat sebagai selesai.';
  if (event.action === 'deleted') return 'Data ini dihapus dari household.';
  if (event.action === 'archived') return 'Data dipindahkan ke arsip dan tetap tersimpan di histori.';
  if (event.entity_type === 'schedule_rotation') return 'Aturan petugas global household diperbarui.';
  return 'Perubahan ini tercatat di audit household.';
}

function EventIcon({ action, entityType }: { action: string; entityType: string }) {
  if (action === 'completed') return <CheckCircle2 />;
  if (action === 'deleted') return <Trash2 />;
  if (action === 'archived') return <Archive />;
  if (action === 'updated' && entityType === 'schedule_rotation') return <Users />;
  if (action === 'updated') return <Settings2 />;
  return <Activity />;
}

export function HistoryPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const history = useQuery({
    queryKey: ['history', household.id],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<AuditEvent[]> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.from('audit_events').select('*').eq('household_id', household.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as AuditEvent[];
    },
  });
  const actorIds = [...new Set((history.data ?? []).map((event) => event.actor_id).filter((actorId): actorId is string => Boolean(actorId)))];
  const actors = useQuery({
    queryKey: ['history-actors', household.id, actorIds],
    enabled: Boolean(supabase && actorIds.length),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', actorIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const actorNames = new Map((actors.data ?? []).map((actor) => [actor.id, actor.full_name?.trim() || 'Anggota household']));
  const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone });

  if (history.isLoading) return <PageSkeleton />;
  if (history.error) return <section className="panel entity-page"><p role="alert">{history.error.message}</p></section>;
  return <section className="entity-page history-page">
    <PageHeader eyebrow="MEOWKU / HISTORI" title="Histori aktivitas" description="Catatan perubahan household yang tidak dapat diubah atau dihapus." />
    <section className="panel history-panel">
      <div className="history-panel-heading"><div><p className="eyebrow">RIWAYAT</p><h2>Aktivitas terbaru</h2></div><span className="count-badge">{history.data?.length ?? 0} aktivitas</span></div>
      {history.data?.length ? <div className="history-timeline">{history.data.map((event) => <article className={`history-event history-event-${event.action}`} key={event.id}><div className="history-event-icon"><EventIcon action={event.action} entityType={event.entity_type} /></div><div className="history-event-body"><div className="history-event-top"><div className="history-event-label"><strong>{formatAuditAction(event.action)}</strong><span>{formatEntityType(event.entity_type)}</span></div><time dateTime={event.created_at}>{dateFormatter.format(new Date(event.created_at))}</time></div><p>{eventDescription(event)}</p><div className="history-event-meta"><span>Oleh <b>{event.actor_id ? actorNames.get(event.actor_id) ?? 'Anggota household' : 'Akun dihapus'}</b></span>{event.entity_id && <span className="history-event-id">ID tersimpan</span>}</div></div></article>)}</div> : <div className="empty"><Activity /><h2>Belum ada histori</h2><p>Aktivitas baru bakal muncul di sini.</p></div>}
    </section>
  </section>;
}
