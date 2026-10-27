import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('notification migration defines recipient-scoped tables and RLS', () => {
  const migration = read('supabase/migrations/20261024002400_notifications.sql');
  for (const table of ['notification_preferences', 'push_subscriptions', 'notifications']) assert.match(migration, new RegExp(`create table.*${table}`, 'is'));
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /unique.*user_id.*occurrence_id.*type/is);
});

test('notification migration exposes read, clear, and unread operations', () => {
  const migration = read('supabase/migrations/20261024002400_notifications.sql');
  assert.match(migration, /mark_notification_read/);
  assert.match(migration, /hide_notifications/);
  assert.match(migration, /notification_unread_count/);
  assert.match(migration, /hidden_at/);
  assert.doesNotMatch(migration, /delete from public\.audit_events/i);
});

test('database types expose notification tables and RPCs', () => {
  const types = read('src/lib/database.types.ts');
  assert.match(types, /notification_preferences/);
  assert.match(types, /push_subscriptions/);
  assert.match(types, /notifications/);
  assert.match(types, /mark_notification_read/);
  assert.match(types, /hide_notifications/);
});
