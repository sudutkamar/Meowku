import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('audit history formats raw action and entity values for people', () => {
  const source = read('src/features/history/HistoryPage.tsx');
  assert.match(source, /formatAuditAction/);
  assert.match(source, /formatEntityType/);
  assert.match(source, /Nama anggota|actorNames/);
  assert.doesNotMatch(source, /<small>\{event\.actor_id\}<\/small>/);
});

test('audit history uses a structured activity layout', () => {
  const source = read('src/features/history/HistoryPage.tsx');
  const styles = read('src/history.css');
  assert.match(source, /history-timeline/);
  assert.match(source, /history-event-icon/);
  assert.match(styles, /history-timeline/);
  assert.match(styles, /data-theme="dark"/);
});
