import { useState } from 'react';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';

export function ExportPage({ household }: { household: Household }) {
  const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  async function download() { setPending(true); setError(null); try { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error: invokeError } = await supabase.functions.invoke('export-household', { body: { householdId: household.id } }); if (invokeError) throw invokeError; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `meowku-${household.id}.json`; anchor.click(); URL.revokeObjectURL(url); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Export gagal.'); } finally { setPending(false); } }
  return <section className="settings-export-section"><PageHeader eyebrow="PENGATURAN" title="Export household" description="Unduh salinan data rumahmu." /><section className="panel export-card"><h2>Data household</h2><p>Unduh data yang bisa kamu akses.</p><button className="primary" type="button" onClick={download} disabled={pending}>{pending ? 'Menyiapkan export...' : 'Unduh export'}</button>{error && <p role="alert">{error}</p>}</section></section>;
}
