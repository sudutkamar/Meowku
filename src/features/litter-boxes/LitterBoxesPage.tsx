import { useState } from 'react';
import { Archive, Box, CheckCircle2 } from 'lucide-react';
import { EntityForm } from '../../components/EntityForm';
import type { Household } from '../../lib/types';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';
import { PageSkeleton } from '../../components/Skeleton';
import { useArchiveLitterBox, useCreateLitterBox, useLitterBoxes, useMarkLitterBoxCleaned, useUpdateLitterBox, type LitterBoxInput } from './useLitterBoxes';

const empty: LitterBoxInput = { name: '', location: '', status: 'clean' };

export function LitterBoxesPage({ household }: { household: Household }) {
  const boxes = useLitterBoxes(household.id);
  const create = useCreateLitterBox(household.id);
  const update = useUpdateLitterBox(household.id);
  const archive = useArchiveLitterBox(household.id);
  const clean = useMarkLitterBoxCleaned(household.id);
  const [form, setForm] = useState<LitterBoxInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const mutation = editing ? update : create;
  const timezone = household.timezone ?? 'Asia/Jakarta';
  function cancel() { setEditing(null); setForm(empty); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (editing) update.mutate({ id: editing, input: form }, { onSuccess: cancel }); else create.mutate(form, { onSuccess: () => setForm(empty) }); }
  function lastCleaned(value: string | null) { return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value)) : 'Belum pernah dicatat'; }

  if (boxes.isLoading) return <PageSkeleton />;
  if (boxes.error) return <section className="panel entity-page"><p role="alert">{boxes.error.message}</p></section>;
  return <section className="entity-page">
    <div className="page-heading"><div><p className="eyebrow">MEOWKU / LITTER BOX</p><h1>Litter Box</h1><p>Kelola lokasi, status, dan riwayat kebersihan litter box household.</p></div></div>
    <div className="entity-layout"><div className="panel entity-form-card"><h2>{editing ? 'Edit litter box' : 'Tambah litter box'}</h2><EntityForm fields={[{ name: 'name', label: 'Nama litter box' }, { name: 'location', label: 'Lokasi', placeholder: 'Opsional' }, { name: 'status', label: 'Status' }]} values={{ name: form.name, location: form.location ?? '', status: form.status ?? 'clean' }} submitLabel={editing ? 'Simpan perubahan' : 'Tambah litter box'} pending={mutation.isPending} error={mutation.error} success={mutation.isSuccess} onRetry={() => { if (editing) update.mutate({ id: editing, input: form }); else create.mutate(form); }} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} onSubmit={submit} onCancel={editing ? cancel : undefined} /></div>
      <div>{boxes.data?.length ? <div className="data-list">{boxes.data.map((box) => <div className="data-row" key={box.id}><div className="row-icon"><Box size={21} aria-hidden="true" /></div><div><b>{box.name}</b><small>{box.location || 'Lokasi belum diisi'} · {box.status} · Dibersihkan: {lastCleaned(box.last_cleaned_at)}</small></div><button type="button" className="primary" disabled={clean.isPending} onClick={() => clean.mutate({ litterBoxId: box.id })}><CheckCircle2 size={15} /> Tandai dibersihkan</button><button type="button" className="secondary" onClick={() => { setEditing(box.id); setForm({ name: box.name, location: box.location ?? '', status: box.status }); }}>Edit</button><ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan litter box?" description={`Litter box “${box.name}” akan disembunyikan dari daftar aktif.`} confirmLabel="Arsipkan litter box" pending={archive.isPending} onConfirm={() => archive.mutate(box.id)} /></div>)}</div> : <div className="empty"><span><Archive size={34} aria-hidden="true" /></span><h2>Belum ada litter box</h2><p>Tambahkan litter box pertama household ini.</p></div>}{clean.error && <p className="notice" role="alert">{clean.error.message}</p>}</div>
    </div>
  </section>;
}
