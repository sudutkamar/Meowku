import { Bell, CheckCheck, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { subscribeForPush } from '../lib/pwa';
import { useHideNotifications, useMarkNotificationRead, useNotifications } from '../features/notifications/useNotifications';

export function NotificationBell({ householdId, onNavigate }: { householdId: string; onNavigate: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const notifications = useNotifications(householdId);
  const markRead = useMarkNotificationRead(householdId);
  const hide = useHideNotifications(householdId);
  const unread = notifications.data?.filter((item) => !item.read_at).length ?? 0;

  async function enablePush() {
    try {
      setPushMessage(null);
      await subscribeForPush(householdId);
      setPushMessage({ kind: 'success', text: 'Notifikasi HP berhasil diaktifkan.' });
    } catch (error) {
      setPushMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Notifikasi belum dapat diaktifkan.' });
    }
  }
  function clearView() {
    hide.mutate(undefined, { onSuccess: () => setClearOpen(false) });
  }

  return <div className="notification-bell"><button type="button" className="preference-button" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={18} aria-hidden="true" />{unread > 0 && <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>}</button>{open && <div className="notification-panel" role="dialog" aria-label="Notifikasi"><div className="notification-panel-heading"><div><b>Notifikasi</b><small>{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</small></div><button type="button" className="icon-button" aria-label="Tutup notifikasi" onClick={() => setOpen(false)}><X size={17} /></button></div><button type="button" className="notification-enable" onClick={enablePush}><Bell size={16} /> Aktifkan notifikasi HP</button>{pushMessage && <p className={`notification-state notification-state-${pushMessage.kind}`} role={pushMessage.kind === 'error' ? 'alert' : 'status'}>{pushMessage.text}</p>}{notifications.isLoading ? <p className="notification-state">Memuat notifikasi...</p> : notifications.error ? <p className="notification-state" role="alert">{notifications.error.message}</p> : notifications.data?.length ? <div className="notification-list">{notifications.data.map((item) => <button type="button" className={`notification-item${item.read_at ? '' : ' unread'}`} key={item.id} onClick={() => { if (!item.read_at) markRead.mutate(item.id); onNavigate('Jadwal'); setOpen(false); }}><span><b>{item.title}</b><small>{item.body}</small><time>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</time></span><ExternalLink size={15} aria-hidden="true" /></button>)}</div> : <p className="notification-state">Belum ada notifikasi.</p>}<button type="button" className="notification-clear" disabled={!notifications.data?.length || hide.isPending} onClick={() => setClearOpen(true)}><CheckCheck size={15} /> Bersihkan tampilan</button></div>}<ConfirmDialog open={clearOpen} title="Bersihkan notifikasi?" description="Notifikasi akan disembunyikan dari tampilan. Histori audit tetap aman tersimpan." confirmLabel="Bersihkan" pending={hide.isPending} onCancel={() => setClearOpen(false)} onConfirm={clearView} /></div>;
}
