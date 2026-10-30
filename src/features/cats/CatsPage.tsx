import { useEffect, useState } from 'react';
import { ArrowLeft, Cat, PawPrint } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { EntityForm } from '../../components/EntityForm';
import { PageSkeleton } from '../../components/Skeleton';
import type { Household } from '../../lib/types';
import { useArchiveCat, useCats, useCreateCat, useDeleteCat, useUpdateCat, type CatInput } from './useCats';
import { CatCarePanel } from './CatCarePanel';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';

const empty: CatInput = { name: '', age_months: 0, breed: '', weight_kg: 0, notes: '', sex: 'unknown', sterilized: false, birth_date: '', body_condition_score: 0, microchip_number: '', allergies: '' };

export function CatsPage({ household }: { household: Household }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeCatId = location.pathname.match(/\/app\/kucing\/([^/]+)$/)?.[1] ?? null;
  const searchParams = new URLSearchParams(location.search);
  const routeTab = searchParams.get('tab');
  const initialTab = routeTab === 'health' || routeTab === 'food' || routeTab === 'expense' ? routeTab : 'summary';
  const cats = useCats(household.id);
  const create = useCreateCat(household.id);
  const update = useUpdateCat(household.id);
  const archive = useArchiveCat(household.id);
  const remove = useDeleteCat(household.id);
  const [form, setForm] = useState<CatInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [careCatId, setCareCatId] = useState<string | null>(routeCatId);
  const mutation = editing ? update : create;
  useEffect(() => setCareCatId(routeCatId), [routeCatId]);

  function cancel() { setEditing(null); setForm(empty); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { ...form, age_months: Number(form.age_months) || 0, weight_kg: Number(form.weight_kg) || undefined, body_condition_score: Number(form.body_condition_score) || undefined };
    if (editing) update.mutate({ id: editing, input }, { onSuccess: cancel });
    else create.mutate(input, { onSuccess: () => setForm(empty) });
  }
  function deleteCat(id: string) { remove.mutate(id); }

  if (cats.isLoading) return <PageSkeleton />;
  if (cats.error) return <section className="panel entity-page"><p role="alert">{cats.error.message}</p></section>;
  const careCat = cats.data?.find((cat) => cat.id === careCatId);
  if (careCat) return <section className="entity-page cat-detail-page">
    <div className="cat-detail-hero">
      <button className="back-link" type="button" onClick={() => { setCareCatId(null); void navigate({ to: '/app/kucing' }); }}><ArrowLeft size={17} /> Kembali ke daftar kucing</button>
      <div className="cat-detail-identity">
        <div className="cat-detail-avatar" aria-hidden="true"><Cat size={28} /></div>
        <div className="cat-detail-copy">
          <p className="eyebrow">MEOWKU / KUCING / PERAWATAN</p>
          <h1>{careCat.name}</h1>
          <div className="cat-detail-meta" aria-label="Informasi kucing">
            <span>{careCat.breed || 'Ras belum diisi'}</span>
            <span>{careCat.age_months} bulan</span>
            {careCat.weight_kg ? <span>{careCat.weight_kg} kg</span> : null}
            <span>BCS {careCat.body_condition_score ?? '—'}/9</span>
          </div>
        </div>
        <button className="secondary cat-detail-profile-action" type="button" onClick={() => { setEditing(careCat.id); setForm({ name: careCat.name, age_months: careCat.age_months, breed: careCat.breed ?? '', weight_kg: careCat.weight_kg ?? undefined, notes: careCat.notes ?? '', sex: careCat.sex, sterilized: careCat.sterilized, birth_date: careCat.birth_date ?? '', body_condition_score: careCat.body_condition_score ?? 0, microchip_number: careCat.microchip_number ?? '', allergies: careCat.allergies ?? '' }); setCareCatId(null); void navigate({ to: '/app/kucing' }); }}><Cat size={17} /> Edit profil</button>
      </div>
    </div>
    <CatCarePanel householdId={household.id} timezone={household.timezone ?? 'Asia/Jakarta'} cats={[careCat]} initialTab={initialTab} onTabChange={(tab) => void navigate({ to: '/app/kucing/$catId', params: { catId: careCat.id }, search: { tab } })} />
  </section>;
  return <section className="entity-page" id="cat-profile">
    <div className="page-heading"><div><p className="eyebrow">MEOWKU / KUCING</p><h1>Kucing</h1><p>Data kucing di rumah kamu.</p></div></div>
    <div className="entity-layout">
      <div className="panel entity-form-card"><h2>{editing ? 'Edit kucing' : 'Tambah kucing'}</h2><EntityForm fields={[{ name: 'name', label: 'Nama kucing' }, { name: 'breed', label: 'Ras', placeholder: 'Opsional' }, { name: 'sex', label: 'Jenis kelamin', type: 'select', options: [{ value: 'unknown', label: 'Belum diketahui' }, { value: 'female', label: 'Betina' }, { value: 'male', label: 'Jantan' }] }, { name: 'sterilized', label: 'Status steril', type: 'select', options: [{ value: 'false', label: 'Belum steril / belum diketahui' }, { value: 'true', label: 'Sudah steril' }] }, { name: 'birth_date', label: 'Tanggal lahir', type: 'date' }, { name: 'age_months', label: 'Usia (bulan)', type: 'number' }, { name: 'weight_kg', label: 'Berat (kg)', type: 'number' }, { name: 'body_condition_score', label: 'BCS (1–9)', type: 'number', placeholder: 'Opsional' }, { name: 'microchip_number', label: 'Nomor microchip', placeholder: 'Opsional' }, { name: 'allergies', label: 'Alergi/intoleransi', placeholder: 'Opsional' }, { name: 'notes', label: 'Catatan', placeholder: 'Opsional' }]} values={Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value ?? '')]))} submitLabel={editing ? 'Simpan perubahan' : 'Tambah kucing'} pending={mutation.isPending} error={mutation.error ?? remove.error} success={mutation.isSuccess} onRetry={() => submit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>)} onChange={(name, value) => setForm((current) => ({ ...current, [name]: name === 'sterilized' ? value === 'true' : value }))} onSubmit={submit} onCancel={editing ? cancel : undefined} /></div>
       <div>{cats.data?.length ? <div className="data-list">{cats.data.map((cat) => <div className="data-row" key={cat.id}><div className="row-icon"><Cat size={21} aria-hidden="true" /></div><div><b>{cat.name}</b><small>{cat.breed || 'Ras belum diisi'} · {cat.age_months} bulan · BCS {cat.body_condition_score ?? '—'}/9</small></div><button type="button" className="primary cat-care-action" onClick={() => { setCareCatId(cat.id); void navigate({ to: '/app/kucing/$catId', params: { catId: cat.id } }); }}>Perawatan</button><button type="button" className="secondary" onClick={() => { setEditing(cat.id); setForm({ name: cat.name, age_months: cat.age_months, breed: cat.breed ?? '', weight_kg: cat.weight_kg ?? undefined, notes: cat.notes ?? '', sex: cat.sex, sterilized: cat.sterilized, birth_date: cat.birth_date ?? '', body_condition_score: cat.body_condition_score ?? 0, microchip_number: cat.microchip_number ?? '', allergies: cat.allergies ?? '' }); }}>Edit</button><ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan kucing?" description={`Kucing “${cat.name}” akan disembunyikan dari daftar aktif.`} confirmLabel="Arsipkan kucing" pending={archive.isPending} onConfirm={() => archive.mutate(cat.id)} /><ConfirmActionButton label="Hapus permanen" title="Hapus kucing secara permanen?" description={`Data “${cat.name}” tidak dapat dipulihkan setelah dihapus permanen.`} confirmLabel="Hapus permanen" pending={remove.isPending} onConfirm={() => deleteCat(cat.id)} /></div>)}</div> : <div className="empty"><span><PawPrint size={34} aria-hidden="true" /></span><h2>Belum ada kucing</h2><p>Tambahkan data kucing pertama household ini.</p></div>}</div>
     </div>
   </section>;
}
