export const queryKeys = {
  household: (householdId: string) => ['household', householdId] as const,
  dashboard: (householdId: string, timezone: string) => ['household', householdId, 'dashboard', timezone] as const,
  cats: (householdId: string) => ['household', householdId, 'cats'] as const,
};
