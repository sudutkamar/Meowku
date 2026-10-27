import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('cat care mutations support reviewed attachments and scan confirmation', () => {
  const hook = read('src/features/cats/useCatCare.ts');
  const page = read('src/features/cats/CatCarePanel.tsx');
  assert.match(hook, /attachment_id/);
  assert.match(hook, /useCreateCatScanRecord/);
  assert.match(hook, /confirm.*scan|Confirm.*Scan/);
  assert.match(page, /Bukti|attachment|Lampiran/);
});
