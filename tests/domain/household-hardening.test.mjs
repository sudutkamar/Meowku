import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20261104000100_household_hardening.sql', 'utf8');

test('household hardening keeps onboarding and timezone settings atomic', () => {
  assert.match(migration, /create or replace function public\.create_household\(\s*household_name text,\s*timezone_value text/s);
  assert.match(migration, /create or replace function public\.update_household_settings/);
  assert.match(migration, /update public\.schedule_occurrences/);
  assert.match(migration, /occurrence\.completed_at is null/);
});

test('schedule deletion refuses to remove records with history', () => {
  assert.match(migration, /schedule_has_history_archive_instead/);
  assert.match(migration, /delete from public\.schedules/);
});

test('household export covers schedule structure and attachment metadata', () => {
  for (const key of ['schedule_slots', 'schedule_targets', 'schedule_occurrences', 'cat_attachments', 'cat_scan_records', 'household_assignees', 'schedule_rotations', 'schedule_rotation_days', 'audit_events']) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.match(migration, /revoke all on function public\.export_household_payload/);
});

test('ownership transfer is server-authorized and auditable', () => {
  assert.match(migration, /public\.household_role\(target_household_id\) <> 'owner'/);
  assert.match(migration, /ownership_transferred/);
  assert.match(migration, /grant execute on function public\.transfer_household_ownership/);
});
