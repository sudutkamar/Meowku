import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const index = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('public/sw.js', 'utf8');
const checklistCss = fs.readFileSync('src/dashboard-checklist.css', 'utf8');

test('localhost defaults to hosted Auth while isolated local mode remains explicit', () => {
  assert.match(packageJson.scripts.dev, /--mode hosted/);
  assert.match(packageJson.scripts['dev:local'], /--mode development/);
  assert.match(fs.readFileSync('README.md', 'utf8'), /npm run dev:local/);
});

test('browser and PWA branding use transparent PNG assets', () => {
  for (const file of ['public/icons/favicon-16.png', 'public/icons/favicon-32.png', 'public/icons/icon-192.png', 'public/icons/icon-512.png']) {
    const bytes = fs.readFileSync(file);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(bytes.length > 100, `${file} should not be an empty placeholder`);
  }
  assert.match(index, /favicon-16\.png/);
  assert.match(index, /favicon-32\.png/);
  assert.match(index, /<title>Meowku — Perawatan Kucing<\/title>/);
  assert.match(serviceWorker, /meowku-shell-v3/);
  assert.match(serviceWorker, /favicon-16\.png/);
  assert.match(serviceWorker, /favicon-32\.png/);
});

test('dashboard category dark-mode colors do not leak into light mode', () => {
  assert.match(checklistCss, /\[data-theme="dark"\] \.dashboard-category-summary \.dashboard-category-chip\.feeding/);
  assert.doesNotMatch(checklistCss, /\}\.dashboard-category-summary \.dashboard-category-chip\{background:transparent/);
});
