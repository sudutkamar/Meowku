export const queryKeys = {
  household: (householdId: string) => ['household', householdId] as const,
  cats: (householdId: string) => ['household', householdId, 'cats'] as const,
  dashboard: (householdId: string | undefined, timezone: string = 'Asia/Jakarta') =>
    ['household', householdId ?? 'missing', 'dashboard', timezone] as const,
  schedules: (householdId: string) => ['household', householdId, 'schedules'] as const,
  scheduleOccurrences: (householdId: string) => ['schedule-occurrences', householdId] as const,
  scheduleHistory: (householdId: string) => ['schedule-history', householdId] as const,
  scheduleRotation: (householdId: string) => ['schedule-rotation', householdId] as const,
  catCare: (householdId: string, catId?: string) =>
    ['household', householdId, 'catcare', catId ?? 'all'] as const,
  members: (householdId: string) => ['household', householdId, 'members'] as const,
  settings: (householdId: string) => ['household', householdId, 'settings'] as const,
};

export const qk = queryKeys;

export const dashboardQueryKey = (householdId: string | undefined, timezone: string = 'Asia/Jakarta') =>
  queryKeys.dashboard(householdId, timezone);
