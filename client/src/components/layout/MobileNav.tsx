import { NavLink } from 'react-router';
import { useStats } from '@/features/dashboard/hooks';
import { cn } from '@/lib/utils';
import { NAV } from './nav';
import { NavBadge } from './Sidebar';

/** Bottom tab bar on phones and tablets — the primary navigation pattern on mobile. */
export function MobileNav() {
  const { data: stats } = useStats();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors',
                isActive && 'text-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="relative">
                  <Icon className="size-5" />
                  {to === '/revision' && (
                    <NavBadge
                      count={stats?.revisionsDue}
                      className="absolute -top-1.5 -right-3 h-4 min-w-4 px-1 text-[9px]"
                    />
                  )}
                </span>
                {short}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
