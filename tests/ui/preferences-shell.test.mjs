import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('UI preferences are persisted separately from business data', () => {
  const source = read('src/components/UIPreferences.tsx');
  assert.match(source, /createContext/);
  assert.match(source, /localStorage/);
  assert.match(source, /meowku-ui-preferences/);
  assert.match(source, /theme/);
  assert.match(source, /language/);
});

test('app shell provides accessible desktop collapse and mobile drawer controls', () => {
  const source = read('src/components/AppShell.tsx');
  assert.match(source, /UIPreferencesProvider/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-controls="primary-navigation"/);
  assert.match(source, /role=\{mobileOpen \? ["']dialog["']/);
  assert.match(source, /Escape/);
  assert.match(source, /Menutup menu/);
});

test('app shell exposes theme and language switches with English labels', () => {
  const source = read('src/components/AppShell.tsx');
  assert.match(source, /Ganti tema|Toggle theme/);
  assert.match(source, /Bahasa|Language/);
  assert.match(source, /Dashboard/);
  assert.match(source, /Schedule|Jadwal/);
  assert.match(source, /Settings|Pengaturan/);
  assert.match(read('src/styles.css'), /data-theme="dark"|\[data-theme=dark\]/);
});

test('language runtime removed: UI is Indonesian-only per AGENTS.md (no DOM text-swap hack)', () => {
  assert.throws(() => read('src/components/LanguageRuntime.tsx'), /ENOENT/);
});

test('entity page heading reserves space for the route mascot', () => {
  const styles = read('src/design/components.css');
  assert.match(styles, /\.entity-page > \.page-heading \{ padding-right: 116px;/);
  assert.match(styles, /max-width: 760px[\s\S]*\.entity-page > \.page-heading \{ padding-right: 78px; \}/);
});
