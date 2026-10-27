import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('application exposes URL-driven product routes', () => {
  const routes = fs.readFileSync('src/routes.tsx', 'utf8');
  for (const path of ["path: '/app'", "path: '/jadwal'", "path: '/kucing'", "path: '/kucing/$catId'", "path: '/laporan'"]) {
    assert.match(routes, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('root route redirects to the authenticated app entrypoint', () => {
  const source = fs.readFileSync('src/routes.tsx', 'utf8');
  const manifest = fs.readFileSync('public/manifest.webmanifest', 'utf8');
  assert.match(source, /RootLanding/);
  assert.match(source, /navigate\(\{ to: '\/app' \}\)/);
  assert.match(manifest, /"start_url": "\/app"/);
});

test('application no longer selects pages from a local page ternary', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /page === ['"]Dashboard['"]\s*\?/);
});
