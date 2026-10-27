import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('notification settings expose reminder and sound controls', () => {
  const source = read('src/features/notifications/NotificationSettings.tsx');
  assert.match(source, /due_reminders/);
  assert.match(source, /sound_enabled/);
  assert.match(source, /Bersihkan tampilan/);
});

test('notification queries remain household scoped', () => {
  const source = read('src/features/notifications/useNotifications.ts');
  assert.match(source, /notifications.*householdId/);
  assert.match(source, /notification_preferences/);
  assert.match(source, /householdId/);
});
