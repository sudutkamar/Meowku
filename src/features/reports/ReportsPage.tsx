import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Household } from '../../lib/types';
import { fetchHouseholdReport } from '../../lib/report-queries';
import { PageSkeleton } from '../../components/Skeleton';
import { householdToday, shiftLocalDate } from '../../lib/timezone';
import { DateInput } from '../../components/DateInput';

export function ReportsPage({ household }: { household: Household }) {
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [range, setRange] = useState(() => { const toDate = householdToday(timezone); return { fromDate: shiftLocalDate(toDate, -30), toDate }; }); const report = useQuery({ queryKey: ['report', household.id, range, timezone], queryFn: () => fetchHouseholdReport(household.id, range, timezone) });
  useEffect(() => { const toDate = householdToday(timezone); setRange({ fromDate: shiftLocalDate(toDate, -30), toDate }); }, [household.id, timezone]);
  if (report.isLoading) return <PageSkeleton />;
  if (report.error) return <section className="panel entity-page"><p role="alert">{report.error.message}</p></section>;
  const data = report.data;
   const hasReportData = Boolean(data && (data.scheduled_total > 0 || data.expense_total > 0 || data.weight_series.length > 0 || data.vaccine_due_total > 0));
   return <section className="entity-page"><div className="page-heading"><div><p className="eyebrow">MEOWKU / LAPORAN</p><h1>Laporan perawatan</h1><p>Lihat ringkasan perawatan sesuai tanggal.</p></div></div><section className="panel report-filters"><label>Dari<DateInput value={range.fromDate} onChange={(e) => setRange({ ...range, fromDate: e.target.value })} /></label><label>Sampai<DateInput value={range.toDate} onChange={(e) => setRange({ ...range, toDate: e.target.value })} /></label></section>{hasReportData ? <><div className="metric-grid"><div className="metric-card"><span>Total terjadwal</span><b>{data?.scheduled_total ?? 0}</b></div><div className="metric-card"><span>Selesai</span><b>{data?.completed_total ?? 0}</b></div><div className="metric-card"><span>Terlewat</span><b>{data?.overdue_total ?? 0}</b></div><div className="metric-card"><span>Tingkat selesai</span><b>{data?.completion_rate ?? 0}%</b></div></div><div className="report-insight-grid"><section className="panel report-insight-card"><p className="eyebrow">PENGELUARAN</p><h2>Pengeluaran tercatat</h2><strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data?.expense_total ?? 0)}</strong>{data?.expense_by_category.length ? <ul>{data.expense_by_category.map((item) => <li key={item.category}><span>{item.category}</span><b>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.amount)}</b></li>)}</ul> : <p>Belum ada pengeluaran di periode ini.</p>}</section><section className="panel report-insight-card"><p className="eyebrow">KESEHATAN</p><h2>Berat badan</h2>{data?.weight_series.length ? <div className="report-series" aria-label="Riwayat berat badan">{data.weight_series.map((item) => <div key={`${item.cat_id}-${item.recorded_at}`}><span style={{ height: `${Math.min(100, Math.max(8, item.weight_kg * 5))}%` }} title={`${item.weight_kg} kg`} /><small>{item.weight_kg} kg</small></div>)}</div> : <p>Belum ada catatan berat di periode ini.</p>}<p>Vaksin mendatang: <b>{data?.vaccine_due_total ?? 0}</b></p></section></div></> : <section className="panel empty"><h2>Belum ada laporan</h2><p>Belum ada data pada periode ini.</p></section>}</section>;
}
