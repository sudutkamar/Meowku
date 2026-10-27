import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('cat detail and care tabs are represented by route state', () => {
  const page = read('src/features/cats/CatsPage.tsx');
  const panel = read('src/features/cats/CatCarePanel.tsx');
  assert.match(page, /useLocation/);
  assert.match(page, /\/app\/kucing\//);
  assert.match(page, /searchParams|location\.search/);
  assert.match(panel, /initialTab/);
  assert.doesNotMatch(panel, /meowku:cat-care-tab/);
});
