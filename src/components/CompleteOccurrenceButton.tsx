import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export function CompleteOccurrenceButton({ busy, onComplete }: { busy: boolean; onComplete: (note?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  function close() { setNote(''); setOpen(false); }
  return <>
    <button type="button" className="secondary" disabled={busy} onClick={() => setOpen(true)}><CheckCircle2 size={15} /> Tandai selesai</button>
    <ConfirmDialog open={open} title="Selesaikan tugas?" description="Tugas akan dicatat sebagai selesai dan masuk histori audit household." confirmLabel="Tandai selesai" pending={busy} onCancel={close} onConfirm={() => { onComplete(note.trim() || undefined); close(); }}>
      <label className="confirm-dialog-confirmation">Catatan (opsional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: Makan habis, litter sudah diganti." rows={3} /></label>
    </ConfirmDialog>
  </>;
}
