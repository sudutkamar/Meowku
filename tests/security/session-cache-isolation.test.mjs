import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('auth session changes remove cached household data', () => {
  const source = readFileSync('src/features/auth/useCurrentSession.ts', 'utf8');
  assert.match(source, /useQueryClient/);
  assert.match(source, /removeQueries/);
  assert.match(source, /SIGNED_OUT|user\.id/);
});
