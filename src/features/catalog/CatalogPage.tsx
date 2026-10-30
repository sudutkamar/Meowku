import { useState } from 'react';
import { Archive, Minus, Plus, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { EntityForm } from '../../components/EntityForm';
import type { Household } from '../../lib/types';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';
import { PageSkeleton } from '../../components/Skeleton';
import { useArchiveCatalogItem, useCatalog, useCreateCatalogItem, useRecordCatalogStockMovement, useUpdateCatalogItem, type CatalogInput, type StockMovementInput } from './useCatalog';

const empty: CatalogInput = { name: '', category: 'other', notes: '', stock_unit: 'unit' };

export function CatalogPage({ household }: { household: Household }) {
  const items = useCatalog(household.id);
  const create = useCreateCatalogItem(household.id);
  const update = useUpdateCatalogItem(household.id);
  const archive = useArchiveCatalogItem(household.id);
  const moveStock = useRecordCatalogStockMovement(household.id);
  const [form, setForm] = useState<CatalogInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [stockItem, setStockItem] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [stockForm, setStockForm] = useState<Omit<StockMovementInput, 'catalogItemId'>>({ movementType: 'in', quantity: 1, note: '' });
  const mutation = editing ? update : create;

  function cancel() { setEditing(null); setForm(empty); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing) update.mutate({ id: editing, input: form }, { onSuccess: cancel });
    else create.mutate(form, { onSuccess: () => setForm(empty) });
  }
  function openStock(item: { id: string; name: string; stock_unit: string }) {
    setStockItem({ id: item.id, name: item.name, unit: item.stock_unit });
    setStockForm({ movementType: 'in', quantity: 1, note: '' });
  }
  function recordStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockItem) return;
    moveStock.mutate({ catalogItemId: stockItem.id, ...stockForm }, { onSuccess: () => setStockItem(null) });
  }

  if (items.isLoading) return <PageSkeleton />;
  if (items.error) return <section className="panel entity-page"><p role="alert">{items.error.message}</p></section>;

  return <section className="entity-page">
    <div className="page-heading"><div><p className="eyebrow">MEOWKU / KATALOG</p><h1>Katalog</h1><p>Kelola kebutuhan perawatan dan persediaan household.</p></div></div>
    <div className="entity-layout">
      <div className="panel entity-form-card">
        <h2>{editing ? 'Edit item' : 'Tambah item'}</h2>
        <EntityForm fields={[{ name: 'name', label: 'Nama item' }, { name: 'category', label: 'Kategori' }, { name: 'stock_unit', label: 'Satuan stok', placeholder: 'contoh: kg, pcs, kaleng' }, { name: 'notes', label: 'Catatan', placeholder: 'Opsional' }]} values={{ name: form.name, category: form.category ?? '', stock_unit: form.stock_unit ?? 'unit', notes: form.notes ?? '' }} submitLabel={editing ? 'Simpan perubahan' : 'Tambah item'} pending={mutation.isPending} error={mutation.error} success={mutation.isSuccess} onRetry={() => { if (editing) update.mutate({ id: editing, input: form }); else create.mutate(form); }} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} onSubmit={submit} onCancel={editing ? cancel : undefined} />
      </div>
      <div>
        {stockItem && <form className="panel stock-movement-form" onSubmit={recordStock}>
          <div className="section-heading"><div><p className="eyebrow">INVENTORY</p><h2>Kelola stok</h2><p>{stockItem.name} · satuan {stockItem.unit}</p></div><button type="button" className="icon-button" aria-label="Tutup kelola stok" onClick={() => setStockItem(null)}>×</button></div>
          <label>Jenis pergerakan<select value={stockForm.movementType} onChange={(event) => setStockForm((current) => ({ ...current, movementType: event.target.value as StockMovementInput['movementType'] }))}><option value="in">Stok masuk</option><option value="out">Stok terpakai</option><option value="adjustment">Atur saldo stok</option></select></label>
          <label>{stockForm.movementType === 'adjustment' ? 'Saldo baru' : 'Jumlah'}<input type="number" min="0" step="0.001" required value={stockForm.quantity} onChange={(event) => setStockForm((current) => ({ ...current, quantity: Number(event.target.value) }))} /></label>
          <label>Catatan<input value={stockForm.note ?? ''} placeholder="Opsional" onChange={(event) => setStockForm((current) => ({ ...current, note: event.target.value }))} /></label>
          <button className="primary" type="submit" disabled={moveStock.isPending}>{moveStock.isPending ? 'Menyimpan...' : 'Simpan pergerakan stok'}</button>
          {moveStock.error && <p role="alert">{moveStock.error.message}</p>}
        </form>}
        {items.data?.length ? <div className="data-list">{items.data.map((item) => <div className="data-row" key={item.id}>
          <div className="row-icon"><ShoppingBag size={21} aria-hidden="true" /></div>
          <div><b>{item.name}</b><small>{item.category || 'Kategori lain'} · Stok: {Number(item.stock_quantity ?? 0).toLocaleString('id-ID')} {item.stock_unit || 'unit'}{item.notes ? ` · ${item.notes}` : ''}</small></div>
          <button type="button" className="secondary" onClick={() => openStock(item)}><SlidersHorizontal size={15} /> Stok</button>
          <button type="button" className="secondary" onClick={() => { setEditing(item.id); setForm({ name: item.name, category: item.category, notes: item.notes, stock_unit: item.stock_unit }); }}>Edit</button>
          <ConfirmActionButton className="row-action" label="Arsipkan" title="Arsipkan item katalog?" description={`Item “${item.name}” akan disembunyikan dari daftar aktif. Data histori tetap aman.`} confirmLabel="Arsipkan item" pending={archive.isPending} onConfirm={() => archive.mutate(item.id)} />
        </div>)}</div> : <div className="empty"><span><Archive size={34} aria-hidden="true" /></span><h2>Belum ada item katalog</h2><p>Tambahkan kebutuhan pertama household ini.</p></div>}
        <p className="field-hint"><Plus size={14} /> Stok masuk dan <Minus size={14} /> stok terpakai tercatat sebagai transaksi dan tidak boleh menghasilkan saldo negatif.</p>
      </div>
    </div>
  </section>;
}
