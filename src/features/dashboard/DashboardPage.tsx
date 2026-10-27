import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, ListChecks, PawPrint, Plus, RefreshCw } from 'lucide-react';
import type { Household } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { PageSkeleton } from '../../components/Skeleton';
import { MascotBuddy } from '../../components/MascotBuddy';
import { useCompleteOccurrence } from '../schedules/useSchedules';
import { dashboardKey, useDashboard } from './useDashboard';

function ageLabel(months: number) {
  if (months < 12) return `${months} bln`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years} th ${remainder} bln` : `${years} th`;
}

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

const categoryMeta: Record<string, { label: string; tone: string }> = {
  feeding: { label: 'Makan', tone: 'feeding' },
  litter: { label: 'Litter box', tone: 'litter' },
  medicine: { label: 'Obat', tone: 'medicine' },
  other: { label: 'Lainnya', tone: 'other' },
};

function categoryLabel(category: string) {
  if (category.startsWith('custom:')) return category.slice(7);
  return categoryMeta[category]?.label ?? 'Lainnya';
}

function occurrenceCategory(item: { schedules: { category: string; custom_category: string | null } | null }) {
  const custom = item.schedules?.category === 'other' ? item.schedules.custom_category?.trim() : '';
  return custom ? `custom:${custom}` : item.schedules?.category ?? 'other';
}

const activityActions: Record<string, string> = { completed: 'Tugas diselesaikan', deleted: 'Data dihapus', archived: 'Data diarsipkan', updated: 'Data diperbarui', created: 'Data dibuat' };
const activityEntities: Record<string, string> = { schedule_occurrence: 'Tugas jadwal', schedule: 'Jadwal', schedule_rotation: 'Rotasi petugas', cat: 'Kucing', litter_box: 'Litter box', catalog_item: 'Katalog' };

function activityActionLabel(action: string) {
  return activityActions[action] ?? action.split('_').join(' ');
}

function activityEntityLabel(entityType: string) {
  return activityEntities[entityType] ?? entityType.split('_').join(' ');
}

export function DashboardPage({ household, onNavigate, displayName }: { household: Household; onNavigate: (page: string) => void; displayName: string }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const dashboard = useDashboard(household.id, timezone);
  const complete = useCompleteOccurrence(household.id);
  const client = useQueryClient();
  const data = dashboard.data;
  const occurrences = data?.todayOccurrences ?? [];
  const completionRate = data?.completionRate ?? null;
  const greeting = new Intl.DateTimeFormat('id-ID', { hour: 'numeric', timeZone: timezone }).format(new Date());
  const hour = Number(greeting.match(/\d+/)?.[0] ?? 12);
  const salutation = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
  const pendingOccurrences = occurrences.filter((item) => item.status !== 'completed');
  const completedOccurrences = occurrences.filter((item) => item.status === 'completed');
  const orderedOccurrences = [...pendingOccurrences, ...completedOccurrences];
  const groupedOccurrences = useMemo(() => {
    const groups = new Map<string, typeof orderedOccurrences>();
    for (const item of orderedOccurrences) {
      const category = occurrenceCategory(item);
      groups.set(category, [...(groups.get(category) ?? []), item]);
    }
    return Array.from(groups.entries());
  }, [orderedOccurrences]);
  const completedCount = completedOccurrences.length;
  const totalCount = occurrences.length;

  function retry() { void dashboard.refetch(); }
  function completeOccurrence(id: string) {
    complete.mutate({ occurrenceId: id }, { onSuccess: () => client.invalidateQueries({ queryKey: dashboardKey(household.id) }) });
  }

  if (dashboard.isLoading) return <PageSkeleton variant="dashboard" />;
  if (dashboard.error) return <section className="dashboard-state panel"><div className="empty-icon"><RefreshCw /></div><h2>Dashboard belum terbuka</h2><p role="alert">{dashboard.error.message}</p><button type="button" onClick={retry}><RefreshCw size={17} /> Coba lagi</button></section>;
  if (!data) return null;
  const setupSteps = [
    { label: 'Tambah kucing', done: data.cats.length > 0, page: 'Kucing' },
    { label: 'Daftarkan litter box', done: data.litterBoxes.length > 0, page: 'Litter Box' },
    { label: 'Buat jadwal perawatan', done: data.activeSchedules > 0, page: 'Jadwal' },
  ];
  const setupComplete = setupSteps.every((step) => step.done);

  return <section className="dashboard-page">
    <PageHeader eyebrow="DASHBOARD" title={`Selamat ${salutation}, ${displayName || 'di Meowku'}!`} description={new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: timezone }).format(new Date())} />
    <MascotBuddy mood={setupComplete ? completionRate === 100 ? 'happy' : 'ready' : 'start'} title={setupComplete ? completionRate === 100 ? 'Semua tugas beres! Meong!' : 'Siap bantu rawat kucingmu?' : 'Yuk siapkan rumah dulu!'} detail={setupComplete ? completionRate === 100 ? 'Hari ini semua checklist sudah tercatat. Kamu dan kucingmu keren.' : 'Tekan maskot ini kapan pun untuk melihat semangat kecil dari Meowku.' : 'Lengkapi panduan mulai agar jadwal, kucing, dan perawatan bisa saling terhubung.'} />
    {!setupComplete && <section className="panel dashboard-setup-card" aria-label="Mulai di Meowku"><div className="dashboard-setup-icon"><ListChecks size={22} /></div><div className="dashboard-setup-copy"><p className="eyebrow">MULAI DI MEOWKU</p><h2>Siapkan rumah kamu</h2><p>Lengkapi tiga langkah ini biar checklist bisa jalan.</p></div><div className="dashboard-setup-steps">{setupSteps.map((step) => <button type="button" key={step.label} className={step.done ? 'done' : ''} onClick={() => onNavigate(step.page)}><span>{step.done ? '✓' : '○'}</span>{step.label}<ArrowRight size={15} /></button>)}</div></section>}

    <section className="dashboard-stats" aria-label="Ringkasan rumah">
      <button type="button" className="dashboard-stat" onClick={() => onNavigate('Kucing')}><span className="dashboard-stat-icon peach"><PawPrint /></span><span><strong>{data.cats.length}</strong><small>Kucing aktif</small></span><ArrowRight /></button>
      <button type="button" className="dashboard-stat" onClick={() => onNavigate('Litter Box')}><span className="dashboard-stat-icon blue"><ClipboardList /></span><span><strong>{data.litterBoxes.length}</strong><small>Litter box aktif</small></span><ArrowRight /></button>
      <button type="button" className="dashboard-stat" onClick={() => onNavigate('Jadwal')}><span className="dashboard-stat-icon green"><CalendarDays /></span><span><strong>{data.activeSchedules}</strong><small>Jadwal aktif</small></span><ArrowRight /></button>
      <div className="dashboard-stat dashboard-stat-progress"><span className="dashboard-stat-icon orange"><CheckCircle2 /></span><span><strong>{completionRate === null ? '—' : `${completionRate}%`}</strong><small>Progress hari ini</small></span><div className="progress-track"><span style={{ width: `${completionRate ?? 0}%` }} /></div></div>
     </section>

     <section className="dashboard-focus-grid" aria-label="Fokus perawatan hari ini">
       <section className="panel dashboard-card dashboard-attention-card">
         <div className="dashboard-card-heading"><div><p className="eyebrow">PERLU PERHATIAN</p><h2>Yang perlu kamu lihat</h2></div></div>
         {data.attentionItems.length ? <div className="dashboard-attention-list">{data.attentionItems.map((item, index) => <button type="button" className="dashboard-attention-row" key={`${item.kind}-${item.label}-${index}`} onClick={() => item.catId ? onNavigate('Kucing') : onNavigate(item.kind === 'overdue' ? 'Riwayat Jadwal' : 'Kucing')}><span className={`attention-marker ${item.kind}`} /><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="dashboard-empty compact"><CheckCircle2 /><h3>Aman, belum ada yang perlu dicek</h3><p>Kalau ada jadwal atau kesehatan yang perlu dilihat, nanti muncul di sini.</p></div>}
       </section>
       <section className="panel dashboard-card">
         <div className="dashboard-card-heading"><div><p className="eyebrow">PER KUCING</p><h2>Progress hari ini</h2></div></div>
         {data.perCatProgress.length ? <div className="cat-progress-list">{data.perCatProgress.map((cat) => <button type="button" className="cat-progress-row" key={cat.id} onClick={() => onNavigate('Kucing')}><span><strong>{cat.name}</strong><small>{cat.total ? `${cat.completed} dari ${cat.total} tugas selesai` : 'Belum ada tugas hari ini'}</small></span><span className="cat-progress-value">{cat.rate === null ? '—' : `${cat.rate}%`}</span></button>)}</div> : <div className="dashboard-empty compact"><PawPrint /><h3>Belum ada kucing</h3><p>Tambah kucing untuk lihat progress-nya.</p></div>}
       </section>
     </section>

     <div className="dashboard-grid">
      <section className="panel dashboard-card dashboard-schedule-card">
        <div className="dashboard-card-heading dashboard-checklist-heading"><div><p className="eyebrow">CHECKLIST HARIAN</p><h2>Jadwal hari ini</h2>{totalCount > 0 && <div className="dashboard-checklist-summary"><strong>{completedCount} dari {totalCount} selesai</strong><span>{pendingOccurrences.length ? `${pendingOccurrences.length} tugas perlu perhatian` : 'Semua tugas beres'}</span></div>}</div><button type="button" className="text-action" onClick={() => onNavigate('Riwayat Jadwal')}>Lihat semua <ArrowRight size={16} /></button></div>
        {occurrences.length ? <><div className="dashboard-checklist-progress" aria-label={`${completedCount} dari ${totalCount} jadwal selesai`}><span style={{ width: `${completionRate ?? 0}%` }} /></div><div className="dashboard-category-summary">{groupedOccurrences.map(([category, items]) => <span className={`dashboard-category-chip ${categoryMeta[category]?.tone ?? 'other'}`} key={category}><b>{categoryLabel(category)}</b><small>{items.filter((item) => item.status === 'completed').length}/{items.length}</small></span>)}</div><div className="dashboard-list dashboard-checklist-list">{groupedOccurrences.map(([category, items]) => <section className="dashboard-category-group" key={category}><div className="dashboard-category-heading"><span className={`dashboard-category-dot ${categoryMeta[category]?.tone ?? 'other'}`} /><h3>{categoryLabel(category)}</h3><small>{items.filter((item) => item.status === 'completed').length} selesai</small></div>{items.map((item) => { const completed = item.status === 'completed'; return <div className={`dashboard-list-row dashboard-checklist-row ${completed ? 'completed' : 'pending'}`} key={item.id}><span className={`schedule-icon ${completed ? 'done' : ''}`}><Clock3 /></span><div className="dashboard-checklist-copy"><strong>{item.schedules?.title ?? 'Jadwal'}</strong><small>{item.slotLabel} · {item.targetLabel} · {timeLabel(item.scheduled_at, timezone)}</small></div><div className="dashboard-checklist-side">{completed ? <span className="status-done"><CheckCircle2 size={17} /> Selesai</span> : <><span className={`occurrence-status status-${item.status}`}>{item.status === 'missed' ? 'Terlewat' : 'Belum selesai'}</span><button type="button" className="primary dashboard-complete" disabled={complete.isPending} onClick={() => completeOccurrence(item.id)}>Tandai selesai</button></>}</div></div>; })}</section>)}</div>{completedCount > 0 && <p className="dashboard-checklist-footer"><CheckCircle2 size={15} /> {completedCount} tugas sudah dicatat hari ini</p>}</> : <div className="dashboard-empty"><CalendarDays /><h3>Belum ada jadwal hari ini</h3><p>Buat jadwal perawatan agar checklist muncul di sini.</p><button type="button" onClick={() => onNavigate('Jadwal')}><Plus size={17} /> Buat jadwal</button></div>}{complete.error && <p className="notice" role="alert">{complete.error.message}</p>}
      </section>

      <section className="panel dashboard-card"><div className="dashboard-card-heading"><div><p className="eyebrow">AKTIVITAS</p><h2>Aktivitas terbaru</h2></div><button type="button" className="text-action" onClick={() => onNavigate('Histori')}>Lihat semua <ArrowRight size={16} /></button></div>{data.recentActivity.length ? <div className="dashboard-list activity-list">{data.recentActivity.map((event) => <div className="activity-row" key={event.id}><span className={`activity-dot activity-dot-${event.action}`} /><div className="activity-copy"><div className="activity-copy-heading"><strong>{activityActionLabel(event.action)}</strong><span className="activity-kind">{activityEntityLabel(event.entity_type)}</span></div><small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(event.created_at))}</small></div></div>)}</div> : <div className="dashboard-empty compact"><Clock3 /><h3>Belum ada aktivitas</h3><p>Perubahan data dan penyelesaian tugas akan tercatat di sini.</p></div>}</section>
    </div>

    <section className="dashboard-lower"><div className="panel dashboard-card"><div className="dashboard-card-heading"><div><p className="eyebrow">RUMAH</p><h2>Data utama</h2></div></div>{data.cats.length || data.litterBoxes.length ? <div className="dashboard-entities"><div><PawPrint size={17} /><span><strong>{data.cats.length}</strong><small>Kucing aktif</small></span><button type="button" onClick={() => onNavigate('Kucing')}>Kelola</button></div><div><ClipboardList size={17} /><span><strong>{data.litterBoxes.length}</strong><small>Litter box</small></span><button type="button" onClick={() => onNavigate('Litter Box')}>Kelola</button></div></div> : <div className="dashboard-empty compact"><PawPrint /><h3>Mulai dari sini</h3><p>Tambah kucing atau litter box dulu.</p><button type="button" onClick={() => onNavigate('Kucing')}><Plus size={17} /> Tambah kucing</button></div>}</div><div className="panel dashboard-card dashboard-cat-card"><div className="dashboard-card-heading"><div><p className="eyebrow">KUCING</p><h2>Kucing aktif</h2></div><button type="button" className="icon-button" aria-label="Tambah kucing" onClick={() => onNavigate('Kucing')}><Plus /></button></div>{data.cats.length ? <div className="cat-strip">{data.cats.slice(0, 4).map((cat) => <button type="button" key={cat.id} onClick={() => onNavigate('Kucing')}><span className="cat-avatar">{cat.photo_url ? <img src={cat.photo_url} alt="" /> : <PawPrint />}</span><strong>{cat.name}</strong><small>{ageLabel(cat.age_months)}</small></button>)}</div> : <div className="dashboard-empty compact"><PawPrint /><h3>Belum ada kucing</h3><p>Tambah data kucing untuk melihatnya di sini.</p><button type="button" onClick={() => onNavigate('Kucing')}><Plus size={17} /> Tambah kucing</button></div>}</div></section>
  </section>;
}
