import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { INDONESIA_TIMEZONES } from '../../lib/timezone';
import { PageHeader } from '../../components/PageHeader';
import { ExportPage } from '../export/ExportPage';
import { NotificationSettings } from '../notifications/NotificationSettings';
import { InstallAppButton } from '../../components/InstallAppButton';

export function SettingsPage({ household }: { household: Household }) {
  const client = useQueryClient(); const [timezone, setTimezone] = useState(household.timezone ?? 'Asia/Jakarta');
  const settings = useQuery({ queryKey: ['household-settings', household.id], queryFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.from('households').select('name, timezone').eq('id', household.id).single(); if (error) throw error; return data; }, initialData: { name: household.name ?? '', timezone: household.timezone ?? 'Asia/Jakarta' } });
  const save = useMutation({ mutationFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.from('households').update({ timezone }).eq('id', household.id).select().single(); if (error) throw error; return data; }, onSuccess: (data) => { setTimezone(data.timezone); client.invalidateQueries({ queryKey: ['current-household'] }); client.invalidateQueries({ queryKey: ['household-settings', household.id] }); } });
  return <section className="entity-page settings-page"><PageHeader eyebrow="PENGATURAN" title="Pengaturan rumah" description="Preferensi ini tersimpan di PostgreSQL dan dipakai oleh jadwal." /><form className="panel settings-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><label>Nama rumah<input value={settings.data?.name ?? ''} disabled /></label><label>Zona waktu<select value={timezone} onChange={(event) => setTimezone(event.target.value)}>{INDONESIA_TIMEZONES.map((item) => <option key={item.value} value={item.value}>{item.label} · {item.name}</option>)}</select></label><button className="primary" type="submit" disabled={save.isPending}>Simpan pengaturan</button>{save.error && <p role="alert">{save.error.message}</p>}{save.isSuccess && <p className="success">Pengaturan tersimpan.</p>}</form><section className="panel install-app-card"><div><p className="eyebrow">APLIKASI MEOWKU</p><h2>Pasang di perangkat</h2><p>Gunakan Meowku sebagai aplikasi agar akses dan notifikasi lebih nyaman.</p></div><InstallAppButton /></section><NotificationSettings householdId={household.id} /><ExportPage household={household} /></section>;
}
