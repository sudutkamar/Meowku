import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('long database-backed collections use bounded internal scrolling', () => {
  const css = readFileSync('src/scroll-overflow.css', 'utf8');
  for (const selector of ['.data-list', '.activity-list', '.history-timeline', '.schedule-timeline', '.schedule-history-timeline', '.member-table', '.assignee-list', '.notification-list', '.search-results']) {
    assert.match(css, new RegExp(`${selector.replace('.', '\\.')}[\\s\\S]*overflow`));
  }
  assert.match(css, /max-height: 560px/);
  assert.match(css, /prefers-reduced-motion/);
});

test('schedule editing targets the form and keeps long form content bounded', () => {
  const source = readFileSync('src/features/schedules/SchedulesPage.tsx', 'utf8');
  const css = readFileSync('src/scroll-overflow.css', 'utf8');
  assert.match(source, /formRef\.current\?\.scrollIntoView/);
  assert.match(source, /is-editing/);
  assert.match(source, /ConfirmActionButton/);
  assert.match(css, /\.schedule-form \{[\s\S]*max-height/);
});

test('archived schedules provide styled restore and permanent-delete actions', () => {
  const source = readFileSync('src/features/schedules/SchedulesPage.tsx', 'utf8');
  const css = readFileSync('src/scroll-overflow.css', 'utf8');
  assert.match(source, /schedule-restore-panel/);
  assert.match(source, /schedule-restore-button/);
  assert.match(source, /status === 'archived'.*Hapus permanen/s);
  assert.match(css, /\.schedule-responsive-list[\s\S]*scrollbar/);
  assert.match(css, /\.schedule-restore-list[\s\S]*flex-wrap/);
});

test('long assignee and rotation labels wrap instead of clipping', () => {
  const css = readFileSync('src/scroll-overflow.css', 'utf8');
  const rotation = readFileSync('src/schedule-rotation.css', 'utf8');
  assert.match(css, /\.members-page \.member-identity b,[\s\S]*white-space: normal/);
  assert.match(css, /\.schedule-rotation-summary-days small[\s\S]*white-space: normal/);
  assert.match(rotation, /\.assignee-create label\{display:grid;gap:8px/);
  assert.match(rotation, /\.assignee-create input\{width:100%;min-width:0\}/);
});

test('permanent schedule deletion requires explicit name confirmation', () => {
  const action = readFileSync('src/components/ConfirmActionButton.tsx', 'utf8');
  const migration = readFileSync('supabase/migrations/20261026000400_true_permanent_schedule_delete.sql', 'utf8');
  assert.match(action, /requiredConfirmation/);
  assert.match(action, /typedConfirmation\.trim\(\) === requiredConfirmation/);
  assert.match(migration, /delete from public\.schedules/);
});

test('custom schedule category helper stays in normal flow on mobile', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.schedule-form \.custom-category-field\s*\{[\s\S]*display: grid/);
  assert.match(css, /\.schedule-form \.custom-category-field \.field-hint\s*\{[\s\S]*display: block/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test('slot labels keep usable width on small screens', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.schedule-form \.slot-editor\s*\{[\s\S]*grid-template-columns: 20px minmax\(0, 1fr\) 88px/);
  assert.match(css, /\.schedule-form \.slot-editor > input\s*\{[\s\S]*min-width: 0/);
  assert.match(css, /\.schedule-form \.slot-editor \.slot-row-actions\s*\{[\s\S]*grid-column: 2 \/ -1/);
  assert.match(css, /container-type: inline-size/);
  assert.match(css, /@container \(max-width: 520px\)/);
  assert.match(css, /\.schedule-form \.slot-editor > \.time-field\s*\{[\s\S]*grid-row: 2/);
  assert.match(css, /\.schedule-form \.slot-editor\s*\{[\s\S]*border-radius: 13px/);
  assert.match(css, /\.schedule-form \.slot-editor > \.time-field::before/);
  assert.match(css, /\.schedule-form \.slot-editor \.slot-move/);
});

test('schedule workspace uses the available desktop width', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.entity-page:has\(\.schedule-layout\)\s*\{[\s\S]*max-width: 1380px/);
  assert.match(css, /\.schedule-layout\s*\{[\s\S]*minmax\(420px, \.92fr\)/);
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1050px\)/);
});

test('management pages share a wider desktop layout and tablet fallback', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.entity-page:has\(\.entity-layout\)\s*\{[\s\S]*max-width: 1320px/);
  assert.match(css, /\.entity-page:has\(\.entity-layout:not\(\.schedule-layout\)\) \.entity-layout:not\(\.schedule-layout\)[\s\S]*minmax\(380px, \.86fr\)/);
  assert.match(css, /\.members-page\s*\{[\s\S]*max-width: 1380px/);
  assert.match(css, /\.members-page \.members-layout[\s\S]*minmax\(390px, \.82fr\)/);
  assert.match(css, /minmax\(330px, \.86fr\)/);
});

test('settings export is a sibling card instead of a nested entity page', () => {
  const settings = readFileSync('src/features/settings/SettingsPage.tsx', 'utf8');
  const exportPage = readFileSync('src/features/export/ExportPage.tsx', 'utf8');
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(settings, /className="entity-page settings-page"/);
  assert.match(exportPage, /className="settings-export-section"/);
  assert.doesNotMatch(exportPage, /className="entity-page"/);
  assert.match(css, /\.settings-page > \.settings-export-section/);
});

test('cross-page copy wraps and heading groups can reflow', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.data-row > div:nth-child\(2\) b,[\s\S]*overflow-wrap: anywhere/);
  assert.match(css, /\.dashboard-list-row strong,[\s\S]*white-space: normal/);
  assert.match(css, /\.schedule-history-title \.occurrence-status\s*\{[\s\S]*flex: 0 0 auto/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.page-heading,[\s\S]*flex-wrap: wrap/);
  assert.match(css, /\.report-insight-grid\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test('mobile shell protects narrow viewports and short screens', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  assert.match(css, /\.app main > header \.global-search[\s\S]*flex: 1 1 auto/);
  assert.match(css, /\.app main > header \.global-search \.search-results[\s\S]*position: fixed/);
  assert.match(css, /\.notification-bell \.notification-panel[\s\S]*max-height: calc\(100dvh - 86px\)/);
  assert.match(css, /\.app \.sidebar[\s\S]*overflow-y: auto/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.language-button/);
  assert.match(css, /\.mobile-household-switcher\s*\{\s*display: none/);
  assert.match(shell, /className="mobile-household-switcher"/);
  assert.match(shell, /document\.body\.style\.overflow = 'hidden'/);
});

test('auth hero keeps readable foreground colors after theme overrides', () => {
  const css = readFileSync('src/responsive-polish.css', 'utf8');
  assert.match(css, /\.auth-page \.auth-hero h2\s*\{[\s\S]*color: #fff7f1/);
  assert.match(css, /\.auth-page \.auth-hero \.auth-hero-copy\s*\{[\s\S]*color: #f1d6c5/);
  assert.match(css, /\.auth-page \.auth-hero \.auth-hero-points\s*\{[\s\S]*color: #ffe6d5/);
});

test('mobile date fields explicitly open the native picker', () => {
  const dateInput = readFileSync('src/components/DateInput.tsx', 'utf8');
  const css = readFileSync('src/styles.css', 'utf8');
  assert.match(dateInput, /showPicker/);
  assert.match(dateInput, /onClick={handleClick}/);
  assert.match(css, /input\[type=date\][\s\S]*touch-action:manipulation/);
  assert.match(css, /::-webkit-calendar-picker-indicator[\s\S]*cursor:pointer/);
  for (const page of [
    'src/features/schedules/SchedulesPage.tsx',
    'src/features/members/ScheduleRotationPanel.tsx',
    'src/features/reports/ReportsPage.tsx',
    'src/features/cats/CatCarePanel.tsx',
    'src/features/cats/CatFoodExpensePanel.tsx',
  ]) assert.doesNotMatch(readFileSync(page, 'utf8'), /type="date"/);
});

test('final layout system keeps desktop canvas and mobile shell coherent', () => {
  const css = readFileSync('src/layout-system.css', 'utf8');
  const main = readFileSync('src/main.tsx', 'utf8');
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  const schedule = readFileSync('src/features/schedules/SchedulesPage.tsx', 'utf8');
  assert.match(main, /layout-system\.css/);
  assert.match(shell, /className="mobile-quick-nav"/);
  assert.match(shell, /Navigasi cepat/);
  assert.match(schedule, /className="slot-editor-meta"/);
  assert.match(css, /grid-template-columns: var\(--layout-sidebar\) minmax\(0, 1fr\)/);
  assert.match(css, /\.app\.sidebar-collapsed\s*\{[\s\S]*grid-template-columns: 88px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.app, \.app\.sidebar-collapsed \{[\s\S]*display: block/);
  assert.match(css, /\.mobile-quick-nav\s*\{[\s\S]*position: fixed/);
  assert.match(css, /\.app:has\(\.sidebar\.mobile-open\) \.mobile-quick-nav/);
  assert.match(css, /\.schedule-form\s*\{[\s\S]*max-height: none/);
  assert.match(css, /\.slot-editor-meta\s*\{[\s\S]*display: flex/);
  assert.match(css, /\.entity-layout, \.schedule-layout, \.members-page \.members-layout \{[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion/);
});
