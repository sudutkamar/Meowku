import { useState } from 'react';
import { EntityForm } from '../../components/EntityForm';
import type { Household } from '../../lib/types';
import { useArchiveLitterBox, useCreateLitterBox, useLitterBoxes, useUpdateLitterBox, type LitterBoxInput } from './useLitterBoxes';
import { Archive, Box } from 'lucide-react';
import { PageSkeleton } from '../../components/Skeleton';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';

const empty: LitterBoxInput = { name: '', location: '', status: 'clean' };
export function LitterBoxesPage({ household }: { household: Household }) {
  const boxes = useLitterBoxes(household.id); const create = useCreateLitterBox(household.id); const update = useUpdateLitterBox(household.id); const archive = useArchiveLitterBox(household.id); const [form, setForm] = useState<LitterBoxInput>(empty); const [editing, setEditing] = useState<string | null>(null); const mutation = editing ? update : create;
  function cancel() { setEditing(null); setForm(empty); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (editing) update.mutate({ id: editing, input: form }, { onSuccess: cancel }); else create.mutate(form, { onSuccess: () => setForm(empty) }); }
  if (boxes.isLoading) return <PageSkeleton />;
  if (boxes.error) return <section className="panel entity-page"><p role="alert">{boxes.error.message}</p></section>;
  return <section className="entity-page"><div className="page-heading"><div><p className="eyebrow">MEOWKU / LITTER BOX</p><h1>Litter Box</h1><p>Kelola lokasi dan status litter box household.</p></div></div><div className="entity-layout"><div className="panel entity-form-card"><h2>{editing ? 'Edit litter box' : 'Tambah litter box'}</h2><EntityForm fields={[{ name: 'name', label: 'Nama litter box' }, { name: 'location', label: 'Lokasi', placeholder: 'Opsional' }, { name: 'status', label: 'Status' }]} values={{ name: form.name, location: form.location ?? '', status: form.status ?? 'clean' }} submitLabel={editing ? 'Simpan perubahan' : 'Tambah litter box'} pending={mutation.isPending} error={mutation.error} success={mutation.isSuccess} onRetry={() => { if (editing) update.mutate({ id: editing, input: form }); else create.mutate(form); }} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} onSubmit={submit} onCancel={editing ? cancel : undefined} /></div><div>{boxes.data?.length ? <div className="data-list">{boxes.data.map((box) => <div className="data-row" key={box.id}><div className="row-icon"><Box size={21} aria-hidden="true" /></div><div><b>{box.name}</b><small>{box.location || 'Lokasi belum diisi'} · {box.status}</small></div><button type="button" className="secondary" onClick={() => { setEditing(box.id); setForm({ name: box.name, location: box.location ?? '', status: box.status }); }}>Edit</button><ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan litter box?" description={`Litter box “${box.name}” akan disembunyikan dari daftar aktif.`} confirmLabel="Arsipkan litter box" pending={archive.isPending} onConfirm={() => archive.mutate(box.id)} /></div>)}</div> : <div className="empty"><span><Archive size={34} aria-hidden="true" /></span><h2>Belum ada litter box</h2><p>Tambahkan litter box pertama household ini.</p></div>}</div></div></section>;
}
