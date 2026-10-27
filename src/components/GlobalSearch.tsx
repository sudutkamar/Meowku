import { Search, Cat, CalendarDays, Box, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useGlobalSearch, type SearchGroup, type SearchResult } from '../features/search/useGlobalSearch';

const icons = { Kucing: Cat, Jadwal: CalendarDays, 'Litter Box': Box, Katalog: ShoppingBag } satisfies Record<SearchGroup, typeof Cat>;
const groups: SearchGroup[] = ['Kucing', 'Jadwal', 'Litter Box', 'Katalog'];

export function GlobalSearch({ householdId, onNavigate }: { householdId: string; onNavigate: (page: string) => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useGlobalSearch(householdId, query);
  const showResults = query.trim().length >= 2;
  function select(result: SearchResult) { onNavigate(result.page); setQuery(''); setActiveIndex(0); }
  function keyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, (results.data?.length ?? 1) - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && results.data?.[activeIndex]) { event.preventDefault(); select(results.data[activeIndex]); }
    if (event.key === 'Escape') setQuery('');
  }
  return <div className="global-search"><label className="search" htmlFor="app-search"><Search size={18} aria-hidden="true" /><input id="app-search" aria-label="Cari data rumah" placeholder="Cari kucing, jadwal, atau aktivitas..." value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={keyDown} /><kbd>/</kbd></label>{showResults && <div className="search-results" role="listbox" aria-label="Hasil pencarian">{results.isLoading && <p className="search-state" aria-live="polite">Memuat hasil...</p>}{results.error && <p className="search-state" role="alert">{results.error.message}</p>}{!results.isLoading && !results.error && !results.data?.length && <p className="search-state">Tidak ada hasil yang cocok.</p>}{groups.map((group) => { const items = results.data?.filter((item) => item.group === group) ?? []; if (!items.length) return null; const Icon = icons[group]; return <section key={group} className="search-group"><h3>{group}</h3>{items.map((item) => { const index = results.data?.indexOf(item) ?? -1; return <button type="button" key={item.id} role="option" aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)}><Icon size={18} aria-hidden="true" /><span><b>{item.label}</b><small>{item.detail}</small></span></button>; })}</section>; })}</div>}</div>;
}
