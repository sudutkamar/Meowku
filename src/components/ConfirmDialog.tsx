import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, pending = false, children, onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);
  onCancelRef.current = onCancel;
  pendingRef.current = pending;
  useEffect(() => {
    if (!open) return;
    const dialog = cancelRef.current?.closest('[role="dialog"]');
    const initialFocus = dialog?.querySelector<HTMLElement>('input, select, textarea, button') ?? cancelRef.current;
    initialFocus?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingRef.current) onCancelRef.current();
      if (event.key !== 'Tab') return;
      const activeDialog = cancelRef.current?.closest('[role="dialog"]');
      if (!activeDialog) return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'));
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <section className="panel confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-description">{description}</p>
      {children}
      <div className="dialog-actions">
        <button ref={cancelRef} className="secondary" type="button" onClick={onCancel} disabled={pending}>Batal</button>
        <button className={destructive ? 'danger-action' : 'primary'} type="button" onClick={onConfirm} disabled={pending}>{pending ? 'Memproses...' : confirmLabel}</button>
      </div>
    </section>
  </div>, document.body);
}
