import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('dashboard focus rows override light card colors in dark mode', () => {
  const css = readFileSync('src/dashboard-checklist.css', 'utf8');
  assert.match(css, /\[data-theme="dark"\].*\.cat-progress-row/);
  assert.match(css, /\[data-theme="dark"\].*\.cat-progress-row small/);
  assert.match(css, /\[data-theme="dark"\].*\.dashboard-attention-row/);
});
