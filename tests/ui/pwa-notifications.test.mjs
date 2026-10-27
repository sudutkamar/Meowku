import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Meowku exposes installable PWA metadata and a notification service worker', () => {
  const manifest = read('public/manifest.webmanifest');
  const worker = read('public/sw.js');
  const html = read('index.html');
  const installButton = read('src/components/InstallAppButton.tsx');
  assert.match(manifest, /display.*standalone/);
  assert.match(manifest, /Meowku/);
  assert.match(manifest, /icons\/icon-192\.png/);
  assert.match(manifest, /icons\/icon-512\.png/);
  assert.match(manifest, /192x192/);
  assert.match(manifest, /512x512/);
  assert.match(worker, /push/);
  assert.match(worker, /notificationclick/);
  assert.match(worker, /DEFAULT_ACTION_URL/);
  assert.match(worker, /normalizeActionUrl/);
  assert.match(worker, /icons\/icon-192\.png/);
  assert.match(worker, /icons\/icon-512\.png/);
  assert.match(installButton, /beforeinstallprompt/);
  assert.match(installButton, /Tambahkan ke layar utama/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /icons\/icon-192\.png/);
  assert.match(html, /rel="icon"/);
  assert.match(html, /rel="apple-touch-icon"/);
});

test('PWA helper handles permission and push setup without pretending when unavailable', () => {
  const source = read('src/lib/pwa.ts');
  const installButton = read('src/components/InstallAppButton.tsx');
  assert.match(source, /Notification\.requestPermission/);
  assert.match(installButton, /Instalasi HP membutuhkan HTTPS/);
  assert.match(source, /VITE_WEB_PUSH_PUBLIC_KEY/);
  assert.match(source, /SetupRequired|setup/i);
  assert.match(source, /Notifikasi HP perlu HTTPS/);
  assert.match(source, /isLocalhost/);
});

test('app shell exposes a notification bell', () => {
  const source = read('src/components/AppShell.tsx');
  assert.match(source, /NotificationBell/);
  assert.match(source, /householdId/);
});

test('mobile header keeps notification, theme, language, and profile controls aligned', () => {
  const css = read('src/layout-system.css');
  assert.match(css, /header-right \.notification-bell[\s\S]*width: 38px/);
  assert.match(css, /profile-avatar-button[\s\S]*border-radius: 50%/);
  assert.match(css, /language-button span[\s\S]*display: none/);
});
