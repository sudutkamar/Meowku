import type { ReactNode } from 'react';
import { PageSkeleton } from './Skeleton';
import { toDatabaseError } from '../lib/database-errors';

export function QueryState({ loading, error, empty, onRetry, children }: { loading?: boolean; error?: Error | null; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div aria-label="Memuat..."><PageSkeleton /></div>;
  if (error) return <section className="panel query-state" role="alert"><p>{toDatabaseError(error).message}</p>{onRetry && <button className="secondary" type="button" onClick={onRetry}>Coba lagi</button>}</section>;
  if (empty) return <section className="panel query-state"><img className="empty-mascot" src="/illustrations/meowku-checklist-cat.webp" alt="" /><h2>Belum ada data</h2><p>Data dari rumahmu bakal muncul di sini.</p></section>;
  return <>{children}</>;
}
