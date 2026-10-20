import { lazy, Suspense, useEffect } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
} from 'react-router';
import { refreshSession } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { AppShell } from '@/components/layout/AppShell';
import { GuestOnly, RequireAuth } from '@/features/auth/guards';
import { PageSkeleton } from '@/components/shared/States';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { LandingPage, NotFoundPage } from '@/features/landing/LandingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SheetPage } from '@/features/sheet/SheetPage';
import { ChapterPage } from '@/features/sheet/ChapterPage';
import { RevisionPage } from '@/features/revision/RevisionPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

// FullCalendar is the heaviest dependency — load it only when the calendar is opened.
const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);

/** Root layout: restores scroll on back/forward and starts new pages at the top. */
function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/sheet', element: <SheetPage /> },
              { path: '/sheet/:slug', element: <ChapterPage /> },
              {
                path: '/calendar',
                element: (
                  <Suspense fallback={<PageSkeleton />}>
                    <CalendarPage />
                  </Suspense>
                ),
              },
              { path: '/revision', element: <RevisionPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/app', element: <Navigate to="/dashboard" replace /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  // Restore the session on load from the httpOnly refresh cookie (no token in localStorage).
  useEffect(() => {
    refreshSession().then((ok) => !ok && useAuth.getState().clear());
  }, []);
  return <RouterProvider router={router} />;
}
