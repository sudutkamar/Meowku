import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { App } from './App';
import { useHouseholdContext } from './lib/household-context';
import { PageSkeleton } from './components/Skeleton';
import { supabase } from './lib/supabase';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(({ DashboardPage: page }) => ({ default: page })));
const CatsPage = lazy(() => import('./features/cats/CatsPage').then(({ CatsPage: page }) => ({ default: page })));
const LitterBoxesPage = lazy(() => import('./features/litter-boxes/LitterBoxesPage').then(({ LitterBoxesPage: page }) => ({ default: page })));
const CatalogPage = lazy(() => import('./features/catalog/CatalogPage').then(({ CatalogPage: page }) => ({ default: page })));
const SchedulesPage = lazy(() => import('./features/schedules/SchedulesPage').then(({ SchedulesPage: page }) => ({ default: page })));
const ScheduleHistoryPage = lazy(() => import('./features/schedule-history/ScheduleHistoryPage').then(({ ScheduleHistoryPage: page }) => ({ default: page })));
const HistoryPage = lazy(() => import('./features/history/HistoryPage').then(({ HistoryPage: page }) => ({ default: page })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then(({ ReportsPage: page }) => ({ default: page })));
const MembersPage = lazy(() => import('./features/members/MembersPage').then(({ MembersPage: page }) => ({ default: page })));
const AdminUsersPage = lazy(() => import('./features/admin-users/AdminUsersPage').then(({ AdminUsersPage: page }) => ({ default: page })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(({ SettingsPage: page }) => ({ default: page })));
const ScheduleSettingsPage = lazy(() => import('./features/schedule-settings/ScheduleSettingsPage').then(({ ScheduleSettingsPage: page }) => ({ default: page })));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

const pagePaths: Record<string, string> = {
  Dashboard: '/app',
  Jadwal: '/app/jadwal',
  Katalog: '/app/katalog',
  Kucing: '/app/kucing',
  'Litter Box': '/app/litter-box',
  Histori: '/app/histori',
  'Riwayat Jadwal': '/app/riwayat-jadwal',
  Laporan: '/app/laporan',
  'Pengaturan Jadwal': '/app/pengaturan-jadwal',
  Pengguna: '/app/pengguna',
  Database: '/app/database-pengguna',
  Pengaturan: '/app/pengaturan',
};

function navigateToPage(page: string) {
  return pagePaths[page] ?? '/app';
}

function DashboardRoute() {
  const { household, displayName } = useHouseholdContext();
  const navigate = useNavigate();
  return <LazyPage><DashboardPage household={household} displayName={displayName} onNavigate={(page) => void navigate({ to: navigateToPage(page) })} /></LazyPage>;
}

function MembersRoute() {
  const { household } = useHouseholdContext();
  const navigate = useNavigate();
  return <LazyPage><MembersPage household={household} onNavigate={(page) => void navigate({ to: navigateToPage(page) })} /></LazyPage>;
}

function AdminUsersRoute() {
  const { household } = useHouseholdContext();
  return <LazyPage><AdminUsersPage household={household} /></LazyPage>;
}

function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { household } = useHouseholdContext();
  const navigate = useNavigate();
  const access = useQuery({
    queryKey: ['household-access', household.id],
    enabled: Boolean(supabase),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.rpc('household_access', { requested_household_id: household.id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const canAccessAdmin = access.data?.role === 'owner' || access.data?.role === 'admin';
  useEffect(() => {
    if (!access.isLoading && !access.error && !canAccessAdmin) void navigate({ to: '/app' });
  }, [access.error, access.isLoading, canAccessAdmin, navigate]);
  if (access.isLoading || (!canAccessAdmin && !access.error)) return <PageSkeleton />;
  if (access.error) return <section className="panel entity-page"><p role="alert">Akses admin belum dapat diverifikasi. Coba lagi.</p></section>;
  return <>{children}</>;
}

function HouseholdPage({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function RootLanding() {
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: '/app' }); }, [navigate]);
  return <PageSkeleton />;
}

const rootRoute = createRootRoute({ component: App });
const rootLandingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: RootLanding });
const appRoute = createRoute({ getParentRoute: () => rootRoute, path: '/app', component: () => <Outlet /> });
const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardRoute });
const scheduleRoute = createRoute({ getParentRoute: () => appRoute, path: '/jadwal', component: () => <LazyPage><SchedulesPage household={useHouseholdContext().household} /></LazyPage> });
const scheduleHistoryRoute = createRoute({ getParentRoute: () => appRoute, path: '/riwayat-jadwal', component: () => <LazyPage><ScheduleHistoryPage household={useHouseholdContext().household} /></LazyPage> });
const catalogRoute = createRoute({ getParentRoute: () => appRoute, path: '/katalog', component: () => <LazyPage><CatalogPage household={useHouseholdContext().household} /></LazyPage> });
const catsRoute = createRoute({ getParentRoute: () => appRoute, path: '/kucing', component: () => <LazyPage><CatsPage household={useHouseholdContext().household} /></LazyPage> });
const catDetailRoute = createRoute({ getParentRoute: () => appRoute, path: '/kucing/$catId', component: () => <LazyPage><CatsPage household={useHouseholdContext().household} /></LazyPage> });
const litterRoute = createRoute({ getParentRoute: () => appRoute, path: '/litter-box', component: () => <LazyPage><LitterBoxesPage household={useHouseholdContext().household} /></LazyPage> });
const historyRoute = createRoute({ getParentRoute: () => appRoute, path: '/histori', component: () => <LazyPage><HistoryPage household={useHouseholdContext().household} /></LazyPage> });
const reportsRoute = createRoute({ getParentRoute: () => appRoute, path: '/laporan', component: () => <AdminOnlyRoute><LazyPage><ReportsPage household={useHouseholdContext().household} /></LazyPage></AdminOnlyRoute> });
const scheduleSettingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengaturan-jadwal', component: () => <AdminOnlyRoute><LazyPage><ScheduleSettingsPage household={useHouseholdContext().household} /></LazyPage></AdminOnlyRoute> });
const membersRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengguna', component: () => <AdminOnlyRoute><MembersRoute /></AdminOnlyRoute> });
const adminUsersRoute = createRoute({ getParentRoute: () => appRoute, path: '/database-pengguna', component: () => <AdminOnlyRoute><AdminUsersRoute /></AdminOnlyRoute> });
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengaturan', component: () => <AdminOnlyRoute><LazyPage><SettingsPage household={useHouseholdContext().household} /></LazyPage></AdminOnlyRoute> });

const routeTree = rootRoute.addChildren([
  rootLandingRoute,
  appRoute.addChildren([dashboardRoute, scheduleRoute, scheduleHistoryRoute, catalogRoute, catsRoute, catDetailRoute, litterRoute, historyRoute, reportsRoute, scheduleSettingsRoute, membersRoute, adminUsersRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree });
export function AppRouter() { return <RouterProvider router={router} />; }
