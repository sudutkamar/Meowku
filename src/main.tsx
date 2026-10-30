import React from 'react'; import { createRoot } from 'react-dom/client'; import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; import { AppRouter } from './routes'; import { ErrorBoundary } from './components/ErrorBoundary'; import { registerMeowkuServiceWorker } from './lib/pwa'; import './styles.css'; import './mascot.css'; import './mascot-buddy.css'; import './cute-layout.css'; import './auth.css'; import './management.css'; import './report.css'; import './brief-overrides.css'; import './dashboard-checklist.css'; import './schedule-rotation.css'; import './schedule-history.css'; import './history.css'; import './profile.css'; import './error-boundary.css'; import './cat-care.css'; import './cat-care-tabs.css'; import './operational-ui.css'; import './revamp.css'; import './whole-ui.css'; import './route-themes.css'; import './scroll-overflow.css'; import './dashboard-polish.css'; import './auth-polish.css'; import './responsive-polish.css'; import './layout-system.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><QueryClientProvider client={queryClient}><AppRouter /></QueryClientProvider></ErrorBoundary></React.StrictMode>);
void registerMeowkuServiceWorker();
