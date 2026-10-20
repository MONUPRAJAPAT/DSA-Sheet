import { NavLink } from 'react-router';
import { Flame, Target } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Progress } from '@/components/ui/progress';
import { useStats } from '@/features/dashboard/hooks';
import { useSolvedToday } from '@/features/sheet/hooks';
import { useAuth } from '@/stores/auth';
import { cn, percent } from '@/lib/utils';
import { NAV } from './nav';

/** Small count badge (e.g. revisions due) shown next to a nav item. */
export function NavBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-revision px-1.5 text-[10px] font-semibold text-white tabular-nums',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar() {
  const { data: stats } = useStats();
  const solvedToday = useSolvedToday();
  const goal = useAuth((s) => s.user?.preferences.dailyGoal ?? 3);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <p className="px-6 pt-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
        Menu
      </p>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-card text-foreground shadow-xs ring-1 ring-border',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'size-[18px] transition-colors',
                    isActive ? 'text-primary' : 'group-hover:text-foreground',
                  )}
                />
                <span className="flex-1">{label}</span>
                {to === '/revision' && <NavBadge count={stats?.revisionsDue} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {stats && (
        <div className="m-3 space-y-4 rounded-xl border bg-card p-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Overall progress</span>
              <span className="font-semibold tabular-nums">
                {percent(stats.solved, stats.total)}%
              </span>
            </div>
            <Progress value={percent(stats.solved, stats.total)} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{stats.solved}</span> of{' '}
              {stats.total} problems solved
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t pt-3.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-md',
                  stats.streak.current
                    ? 'bg-orange-500/12 text-orange-500'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Flame className="size-3.5" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold tabular-nums">
                  {stats.streak.current}d
                </span>
                <span className="block text-[10px] text-muted-foreground">Streak</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-md',
                  solvedToday >= goal ? 'bg-easy-soft text-easy' : 'bg-primary/10 text-primary',
                )}
              >
                <Target className="size-3.5" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold tabular-nums">
                  {Math.min(solvedToday, 99)}/{goal}
                </span>
                <span className="block text-[10px] text-muted-foreground">Today</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
