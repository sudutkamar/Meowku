import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('shared confirmation dialog exposes accessible pending actions', () => {
  const source = read('src/components/ConfirmDialog.tsx');
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal/);
  assert.match(source, /onCancel/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /onCancelRef/);
  assert.match(source, /\}, \[open\]\)/);
});

test('query state exposes retry action for database errors', () => {
  const source = read('src/components/QueryState.tsx');
  assert.match(source, /onRetry/);
  assert.match(source, /Coba lagi/);
});
