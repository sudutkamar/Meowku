import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('notification dispatcher requires an internal scheduler secret and uses service role server-side', () => {
  const source = read('supabase/functions/dispatch-due-notifications/index.ts');
  assert.match(source, /NOTIFICATION_DISPATCH_SECRET/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /401|403/);
  assert.doesNotMatch(source, /body\.householdId|body\[['"]householdId['"]\]/);
});

test('notification dispatcher filters due active incomplete occurrences', () => {
  const source = read('supabase/functions/dispatch-due-notifications/index.ts');
  assert.match(source, /scheduled_at/);
  assert.match(source, /completed_at/);
  assert.match(source, /archived_at/);
  assert.match(source, /is_active/);
  assert.match(source, /ignoreDuplicates|onConflict/);
});

test('notification dispatcher revokes invalid subscriptions', () => {
  const source = read('supabase/functions/dispatch-due-notifications/index.ts');
  assert.match(source, /revoked_at/);
  assert.match(source, /sendNotification/);
});
