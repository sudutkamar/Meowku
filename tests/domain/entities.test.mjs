import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('care entity migration scopes cats, litter boxes, and catalog items to households', () => {
  const migration = read('supabase/migrations/20261024000600_care_entities.sql');
  for (const table of ['cats', 'litter_boxes', 'catalog_items']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`create policy ${table}_member`));
    assert.match(migration, new RegExp(`${table}.*household_id`));
  }
  assert.match(migration, /is_household_member\(household_id\)/);
});

test('care entity migration supports archive without destructive deletion', () => {
  const migration = read('supabase/migrations/20261024000600_care_entities.sql');
  assert.match(migration, /is_active boolean not null default true/);
  assert.match(migration, /update_at|updated_at/);
  assert.match(migration, /drop policy if exists .*_member/);
});

test('cats expose an owner/admin delete action in addition to archive', () => {
  const hook = read('src/features/cats/useCats.ts');
  const page = read('src/features/cats/CatsPage.tsx');
  assert.match(hook, /useDeleteCat/);
  assert.match(hook, /\.delete\(\)/);
  assert.match(page, /Hapus/);
  assert.match(page, /confirm/);
});

test('care hooks validate names, query active rows, and invalidate collections', () => {
  for (const feature of ['cats', 'litter-boxes', 'catalog']) {
    const source = read(`src/features/${feature}/use${feature === 'litter-boxes' ? 'LitterBoxes' : feature === 'cats' ? 'Cats' : 'Catalog'}.ts`);
    assert.match(source, /trim\(\)/);
    assert.match(source, /Nama wajib diisi/);
    assert.match(source, /is_active/);
    assert.match(source, /invalidateQueries/);
  }
});

test('entity pages expose loading, error, empty, and create states', () => {
  for (const feature of ['cats', 'litter-boxes', 'catalog']) {
    const page = read(`src/features/${feature}/${feature === 'litter-boxes' ? 'LitterBoxes' : feature === 'cats' ? 'Cats' : 'Catalog'}Page.tsx`);
    assert.match(page, /isLoading/);
    assert.match(page, /role="alert"/);
    assert.match(page, /Belum ada/);
    assert.match(page, /Tambah/);
  }
});
