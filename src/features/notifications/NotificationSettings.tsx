import { useEffect, useState } from 'react';
import { useHideNotifications, useNotificationPreferences, useUpdateNotificationPreferences } from './useNotifications';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';

export function NotificationSettings({ householdId }: { householdId: string }) {
  const preferences = useNotificationPreferences(householdId);
  const update = useUpdateNotificationPreferences(householdId);
  const hide = useHideNotifications(householdId);
  const [dueReminders, setDueReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => { if (!preferences.data) return; setDueReminders(preferences.data.due_reminders); setSoundEnabled(preferences.data.sound_enabled); }, [preferences.data]);
  return <section className="panel notification-settings"><div className="section-heading"><div><p className="eyebrow">NOTIFIKASI</p><h2>Pengingat</h2></div></div><label className="checkbox-label"><input type="checkbox" checked={dueReminders} onChange={(event) => { setDueReminders(event.target.checked); update.mutate({ due_reminders: event.target.checked, sound_enabled: soundEnabled }); }} /> Ingatkan saat jadwal tiba</label><label className="checkbox-label"><input type="checkbox" checked={soundEnabled} onChange={(event) => { setSoundEnabled(event.target.checked); update.mutate({ due_reminders: dueReminders, sound_enabled: event.target.checked }); }} /> Pakai suara/vibrasi</label><ConfirmActionButton className="notification-clear" label="Bersihkan tampilan" title="Bersihkan notifikasi?" description="Notifikasi akan disembunyikan. Histori tetap aman." confirmLabel="Bersihkan" pending={hide.isPending} onConfirm={() => hide.mutate()} />{update.error && <p className="notice" role="alert">{update.error.message}</p>}</section>;
}
