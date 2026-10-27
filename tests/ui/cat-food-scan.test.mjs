import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync('src/features/cats/CatFoodExpensePanel.tsx', 'utf8');

test('food panel exposes barcode and label scan actions with review copy', () => {
  assert.match(panel, /Scan barcode/);
  assert.match(panel, /Foto label/);
  assert.match(panel, /Konfirmasi dan simpan/);
  assert.match(panel, /brand/);
  assert.match(panel, /product_name/);
  assert.match(panel, /food_type/);
});

test('food scan does not bypass draft review', () => {
  assert.match(panel, /useScanFood/);
  assert.match(panel, /scanDraft/);
  assert.match(panel, /function confirmScan/);
});
