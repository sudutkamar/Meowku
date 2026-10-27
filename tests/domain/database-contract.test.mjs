import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Supabase client uses a generated business-table Database contract', () => {
  const source = read('src/lib/supabase.ts');
  const types = read('src/lib/database.types.ts');
  assert.match(source, /createClient<Database>/);
  assert.match(source, /import type \{ Database \} from ['"]\.\/database\.types['"]/);
  assert.match(types, /Tables:/);
  assert.match(types, /cats:/);
  assert.match(types, /schedules:/);
  assert.match(types, /schedule_occurrences:/);
  assert.doesNotMatch(source, /SupabaseClient\s*>?;?\s*$/);
});

test('business mutations use explicit DTO payloads instead of spreading form input', () => {
  for (const path of [
    'src/features/cats/useCats.ts',
    'src/features/litter-boxes/useLitterBoxes.ts',
    'src/features/catalog/useCatalog.ts',
    'src/features/schedules/useSchedules.ts',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /insert\(\{\.\.\.input/);
    assert.doesNotMatch(source, /update\(\{\.\.\.input/);
  }
});

test('schedule creation is delegated to a database RPC with server-owned identity', () => {
  const hook = read('src/features/schedules/useSchedules.ts');
  const migration = read('supabase/migrations/20261024001100_schedule_contract_hardening.sql');
  assert.match(hook, /rpc\(['"]create_schedule/);
  assert.doesNotMatch(hook, /from\(['"]schedules['"]\)\.insert/);
  assert.match(migration, /create or replace function public\.create_schedule/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /owner_id/);
});

test('schedule generation and completion are safe to replay', () => {
  const migration = read('supabase/migrations/20261024001100_schedule_contract_hardening.sql');
  const generation = read('supabase/migrations/20261024000700_schedules_and_occurrences.sql');
  assert.match(generation, /on conflict \(schedule_id, target_key, local_date\) do nothing/i);
  assert.match(migration, /already_completed|completed_at is not null/i);
  assert.match(migration, /audit_events/);
  assert.match(migration, /drop policy if exists/);
});
