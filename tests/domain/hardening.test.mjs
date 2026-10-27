import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('database errors have shared Indonesian mapping', () => {
  const source = read('src/lib/database-errors.ts');
  assert.match(source, /23505/);
  assert.match(source, /42501/);
  assert.match(source, /messages/);
  assert.match(source, /PGRST202/);
});

test('application mounts an error boundary and mutations expose retry-safe status', () => {
  const boundary = read('src/components/ErrorBoundary.tsx');
  const source = read('src/App.tsx') + read('src/components/EntityForm.tsx') + read('src/features/cats/CatsPage.tsx') + read('src/features/litter-boxes/LitterBoxesPage.tsx') + read('src/features/catalog/CatalogPage.tsx');
  assert.match(boundary, /componentDidCatch/);
  assert.match(source, /isSuccess/);
  assert.match(source, /isError|error/);
  assert.match(source, /Coba lagi|Coba simpan lagi|Ulangi/);
});
