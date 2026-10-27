import { useState } from 'react';
import { EntityForm } from '../../components/EntityForm';
import type { Household } from '../../lib/types';
import { useArchiveCatalogItem, useCatalog, useCreateCatalogItem, useUpdateCatalogItem, type CatalogInput } from './useCatalog';
import { Archive, ShoppingBag } from 'lucide-react';
import { PageSkeleton } from '../../components/Skeleton';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';

const empty: CatalogInput = { name: '', category: 'other', notes: '' };
export function CatalogPage({ household }: { household: Household }) {
  const items = useCatalog(household.id); const create = useCreateCatalogItem(household.id); const update = useUpdateCatalogItem(household.id); const archive = useArchiveCatalogItem(household.id); const [form, setForm] = useState<CatalogInput>(empty); const [editing, setEditing] = useState<string | null>(null); const mutation = editing ? update : create;
  function cancel() { setEditing(null); setForm(empty); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (editing) update.mutate({ id: editing, input: form }, { onSuccess: cancel }); else create.mutate(form, { onSuccess: () => setForm(empty) }); }
  if (items.isLoading) return <PageSkeleton />;
  if (items.error) return <section className="panel entity-page"><p role="alert">{items.error.message}</p></section>;
  return <section className="entity-page"><div className="page-heading"><div><p className="eyebrow">MEOWKU / KATALOG</p><h1>Katalog</h1><p>Kelola kebutuhan perawatan dan persediaan household.</p></div></div><div className="entity-layout"><div className="panel entity-form-card"><h2>{editing ? 'Edit item' : 'Tambah item'}</h2><EntityForm fields={[{ name: 'name', label: 'Nama item' }, { name: 'category', label: 'Kategori' }, { name: 'notes', label: 'Catatan', placeholder: 'Opsional' }]} values={{ name: form.name, category: form.category ?? '', notes: form.notes ?? '' }} submitLabel={editing ? 'Simpan perubahan' : 'Tambah item'} pending={mutation.isPending} error={mutation.error} success={mutation.isSuccess} onRetry={() => { if (editing) update.mutate({ id: editing, input: form }); else create.mutate(form); }} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} onSubmit={submit} onCancel={editing ? cancel : undefined} /></div><div>{items.data?.length ? <div className="data-list">{items.data.map((item) => <div className="data-row" key={item.id}><div className="row-icon"><ShoppingBag size={21} aria-hidden="true" /></div><div><b>{item.name}</b><small>{item.category || 'Kategori lain'}{item.notes ? ` · ${item.notes}` : ''}</small></div><button type="button" className="secondary" onClick={() => { setEditing(item.id); setForm({ name: item.name, category: item.category, notes: item.notes }); }}>Edit</button><ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan item katalog?" description={`Item “${item.name}” akan disembunyikan dari daftar aktif. Data histori tetap aman.`} confirmLabel="Arsipkan item" pending={archive.isPending} onConfirm={() => archive.mutate(item.id)} /></div>)}</div> : <div className="empty"><span><Archive size={34} aria-hidden="true" /></span><h2>Belum ada item katalog</h2><p>Tambahkan kebutuhan pertama household ini.</p></div>}</div></div></section>;
}
