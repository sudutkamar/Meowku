import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('schedule settings has a dedicated page instead of reusing the schedule page', () => {
  const routes = readFileSync('src/routes.tsx', 'utf8');
  const settings = readFileSync('src/features/schedule-settings/ScheduleSettingsPage.tsx', 'utf8');
  assert.match(routes, /ScheduleSettingsPage/);
  assert.doesNotMatch(routes, /scheduleSettingsRoute[\s\S]*SchedulesPage/);
  assert.match(settings, /ScheduleRotationPanel/);
  assert.match(settings, /Pengaturan jadwal/);
  assert.match(settings, /can_manage_members/);
  assert.doesNotMatch(settings, /ScheduleRotationPanel household=\{household\} canManage \/>/);
});

test('member page does not duplicate schedule assignment settings', () => {
  const page = readFileSync('src/features/members/MembersPage.tsx', 'utf8');
  assert.doesNotMatch(page, /ScheduleRotationPanel/);
});

test('schedule settings exposes a database-backed assignee list with edit and archive actions', () => {
  const panel = readFileSync('src/features/members/ScheduleRotationPanel.tsx', 'utf8');
  const hooks = readFileSync('src/features/members/useScheduleRotation.ts', 'utf8');
  assert.match(panel, /assignee-list/);
  assert.match(panel, /Edit/);
  assert.match(panel, /Hapus/);
  assert.match(hooks, /archive_household_assignee/);
});
