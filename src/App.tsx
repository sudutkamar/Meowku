import { supabase, supabaseConfigured } from './lib/supabase';
import { useCurrentSession } from './features/auth/useCurrentSession';
import { PasswordRecoveryPage } from './features/auth/PasswordRecoveryPage';
import { useCurrentHouseholds } from './features/onboarding/useOnboarding';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { Household } from './lib/types';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSkeleton } from './components/Skeleton';
import { HouseholdProvider } from './lib/household-context';
import { Outlet } from '@tanstack/react-router';

const AuthPage = lazy(() => import('./features/auth/AuthPage').then(({ AuthPage: page }) => ({ default: page })));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage').then(({ OnboardingPage: page }) => ({ default: page })));

function SetupRequired() {
  return <main className="setup-required"><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><h1>Supabase belum siap</h1><p>Isi pengaturan Supabase di <code>.env.local</code>.</p></main>;
}

function AuthenticatedApp({ email, household, households, displayName }: { email: string; household: Household; households: Household[]; displayName: string }) {
  const [activeId, setActiveId] = useState(household.id);
  useEffect(() => { if (!households.some((item) => item.id === activeId)) setActiveId(household.id); }, [activeId, household.id, households]);
  const activeHousehold = households.find((item) => item.id === activeId) ?? household;
  return <HouseholdProvider value={{ email, household: activeHousehold, households, displayName, setActiveHousehold: setActiveId }}><AppShell email={email} householdId={activeHousehold.id} households={households} onHouseholdChange={setActiveId} onSignOut={() => void supabase?.auth.signOut()}><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></AppShell></HouseholdProvider>;
}

export function App() {
  const { session, loading } = useCurrentSession();
  const households = useCurrentHouseholds(session?.user.id);
  if (!supabaseConfigured) return <SetupRequired />;
  if (loading) return <PageSkeleton />;
  if (session && new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery') return <PasswordRecoveryPage />;
  if (!session) return <Suspense fallback={<PageSkeleton />}><AuthPage /></Suspense>;
  if (households.isLoading) return <PageSkeleton />;
  if (households.error) return <main className="setup-required"><h1>Rumah belum bisa dibuka</h1><p>{households.error.message}</p></main>;
  if (!households.data?.length) return <Suspense fallback={<PageSkeleton />}><OnboardingPage /></Suspense>;
  return <ErrorBoundary><AuthenticatedApp email={session.user.email ?? ''} displayName={session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? ''} household={households.data[0]} households={households.data} /></ErrorBoundary>;
}
