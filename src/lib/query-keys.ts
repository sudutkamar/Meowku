export const queryKeys = {
  household: (householdId: string) => ['household', householdId] as const,
  cats: (householdId: string) => ['household', householdId, 'cats'] as const,
};

export const dashboardQueryKey = (householdId: string | undefined, timezone: string = 'Asia/Jakarta') =>
  ['household', householdId ?? 'missing', 'dashboard', timezone] as const;
