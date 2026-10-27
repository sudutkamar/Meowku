import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { App } from './App';
import { useHouseholdContext } from './lib/household-context';
import { PageSkeleton } from './components/Skeleton';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(({ DashboardPage: page }) => ({ default: page })));
const CatsPage = lazy(() => import('./features/cats/CatsPage').then(({ CatsPage: page }) => ({ default: page })));
const LitterBoxesPage = lazy(() => import('./features/litter-boxes/LitterBoxesPage').then(({ LitterBoxesPage: page }) => ({ default: page })));
const CatalogPage = lazy(() => import('./features/catalog/CatalogPage').then(({ CatalogPage: page }) => ({ default: page })));
const SchedulesPage = lazy(() => import('./features/schedules/SchedulesPage').then(({ SchedulesPage: page }) => ({ default: page })));
const ScheduleHistoryPage = lazy(() => import('./features/schedule-history/ScheduleHistoryPage').then(({ ScheduleHistoryPage: page }) => ({ default: page })));
const HistoryPage = lazy(() => import('./features/history/HistoryPage').then(({ HistoryPage: page }) => ({ default: page })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then(({ ReportsPage: page }) => ({ default: page })));
const MembersPage = lazy(() => import('./features/members/MembersPage').then(({ MembersPage: page }) => ({ default: page })));
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
const reportsRoute = createRoute({ getParentRoute: () => appRoute, path: '/laporan', component: () => <LazyPage><ReportsPage household={useHouseholdContext().household} /></LazyPage> });
const scheduleSettingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengaturan-jadwal', component: () => <LazyPage><ScheduleSettingsPage household={useHouseholdContext().household} /></LazyPage> });
const membersRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengguna', component: MembersRoute });
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/pengaturan', component: () => <LazyPage><SettingsPage household={useHouseholdContext().household} /></LazyPage> });

const routeTree = rootRoute.addChildren([
  rootLandingRoute,
  appRoute.addChildren([dashboardRoute, scheduleRoute, scheduleHistoryRoute, catalogRoute, catsRoute, catDetailRoute, litterRoute, historyRoute, reportsRoute, scheduleSettingsRoute, membersRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree });
export function AppRouter() { return <RouterProvider router={router} />; }
