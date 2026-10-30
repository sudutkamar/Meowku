import type { FormEvent } from 'react';

export type EntityField = { name: string; label: string; placeholder?: string; type?: 'text' | 'number' | 'date' | 'select'; options?: Array<{ value: string; label: string }> };

export function EntityForm({ fields, values, submitLabel, pending, onChange, onSubmit, onCancel, error, success, onRetry }: {
  fields: EntityField[];
  values: Record<string, string>;
  submitLabel: string;
  pending?: boolean;
  onChange: (name: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  error?: Error | null;
  success?: boolean;
  onRetry?: () => void;
}) {
  return <form className="entity-form" onSubmit={onSubmit}>
    {fields.map((field) => <label key={field.name}>{field.label}{field.type === 'select' ? <select required={field.name === 'name'} value={values[field.name] ?? ''} onChange={(event) => onChange(field.name, event.target.value)}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={field.name === 'name'} type={field.type ?? 'text'} placeholder={field.placeholder} value={values[field.name] ?? ''} onChange={(event) => onChange(field.name, event.target.value)} />}</label>)}
    {error && <p className="notice" role="alert">{error.message}</p>}{success && <p className="success" role="status">Tersimpan.</p>}<div className="form-actions"><button type="submit" className="primary" disabled={pending}>{pending ? 'Menyimpan...' : submitLabel}</button>{error && onRetry && <button type="button" className="secondary" onClick={onRetry} disabled={pending}>Coba lagi</button>}{onCancel && <button type="button" className="secondary" onClick={onCancel}>Batal</button>}</div>
  </form>;
}
