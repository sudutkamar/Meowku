import { createContext, useContext, type ReactNode } from 'react';
import type { Household } from './types';

export type HouseholdContextValue = {
  household: Household;
  households: Household[];
  setActiveHousehold: (householdId: string) => void;
  email: string;
  displayName: string;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ value, children }: { value: HouseholdContextValue; children: ReactNode }) {
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHouseholdContext() {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('Household context belum tersedia.');
  return value;
}
