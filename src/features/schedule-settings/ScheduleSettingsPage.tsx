import { useQuery } from '@tanstack/react-query';
import type { Household } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { supabase } from '../../lib/supabase';
import { ScheduleRotationPanel } from '../members/ScheduleRotationPanel';

export function ScheduleSettingsPage({ household }: { household: Household }) {
  const access = useQuery({ queryKey: ['household-access', household.id], queryFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.rpc('household_access', { requested_household_id: household.id }); if (error) throw error; return data?.[0] ?? null; } });
  const canManage = access.data?.can_manage_members === true;
  return <section className="entity-page schedule-settings-page">
    <PageHeader eyebrow="PENGATURAN JADWAL" title="Pengaturan jadwal" description="Atur siapa yang menerima tugas perawatan pada setiap hari, tanpa harus membuat mereka login." />
    <div className="schedule-settings-intro panel"><div><p className="eyebrow">PEMBAGIAN PETUGAS</p><h2>Nama petugas dan rotasi mingguan</h2><p className="field-hint">Tambahkan nama siapa pun yang akan bertugas, lalu pilih namanya untuk Senin sampai Minggu. Jadwal operasional tetap dikelola di menu Jadwal.</p></div></div>
    <QueryState loading={access.isLoading} error={access.error}>
      {!canManage && <div className="panel member-access-note"><h2>Akses admin diperlukan</h2><p>Hanya owner atau admin household yang dapat mengatur petugas dan rotasi jadwal.</p></div>}
      {canManage && <ScheduleRotationPanel household={household} canManage={canManage} />}
    </QueryState>
  </section>;
}
