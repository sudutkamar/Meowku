import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

type ConfirmActionButtonProps = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  className?: string;
  confirmationText?: string;
  confirmationLabel?: string;
};

export function ConfirmActionButton({ label, title, description, confirmLabel, onConfirm, pending = false, destructive = true, className = 'danger-action', confirmationText, confirmationLabel = 'Ketik nama untuk melanjutkan' }: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const inferredConfirmation = !confirmationText && label === 'Hapus permanen' ? description.match(/Jadwal "([^"]+)"/)?.[1] : undefined;
  const requiredConfirmation = confirmationText ?? inferredConfirmation;
  const canConfirm = !requiredConfirmation || typedConfirmation.trim() === requiredConfirmation;
  const close = () => { setTypedConfirmation(''); setOpen(false); };
  return <>
    <button className={className} type="button" disabled={pending} onClick={() => { setTypedConfirmation(''); setOpen(true); }}>{label}</button>
    <ConfirmDialog open={open} title={title} description={description} confirmLabel={confirmLabel} destructive={destructive} pending={pending} onCancel={close} onConfirm={() => { if (!canConfirm) return; onConfirm(); close(); }}>
      {requiredConfirmation && <label className="confirm-dialog-confirmation">{confirmationLabel}<strong>{requiredConfirmation}</strong><input autoComplete="off" value={typedConfirmation} onChange={(event) => setTypedConfirmation(event.target.value)} placeholder={requiredConfirmation} /></label>}
    </ConfirmDialog>
  </>;
}
