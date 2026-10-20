import { Navigate, Outlet, useLocation } from 'react-router';
import { LogoMark } from '@/components/shared/Logo';
import { useAuth } from '@/stores/auth';

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark className="size-11 animate-pulse" />
      <p className="text-sm text-muted-foreground">Loading your sheet…</p>
    </div>
  );
}

/** Only for signed-in students; remembers where they were going. */
export function RequireAuth() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return <Outlet />;
}

/** Login/register are hidden once signed in. */
export function GuestOnly() {
  const status = useAuth((s) => s.status);
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
