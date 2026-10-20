import { Link } from 'react-router';
import { ArrowLeft, Check, Flame, Repeat } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { cn } from '@/lib/utils';

/** Product preview built from the app's own design tokens, so it follows the light / dark theme. */
function PreviewCard() {
  const rows = [
    { t: 'Two Sum', d: 'Easy' as const, done: true },
    { t: 'Group Anagrams', d: 'Medium' as const, done: true },
    { t: 'Top K Frequent Elements', d: 'Medium' as const, done: false },
  ];
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -top-7 right-6 z-10 flex items-center gap-2.5 rounded-xl border bg-popover/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
        <span className="flex size-8 items-center justify-center rounded-lg bg-revision/12">
          <Repeat className="size-4 text-revision" />
        </span>
        <span>
          <span className="block text-[11px] text-muted-foreground">Revision scheduled</span>
          <span className="block text-sm font-semibold">Tomorrow · Two Sum</span>
        </span>
      </div>

      <div className="rounded-2xl border bg-card/90 p-5 pt-6 shadow-2xl shadow-primary/10 backdrop-blur-sm dark:shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Chapter 3
            </p>
            <p className="mt-0.5 font-semibold">Hashing</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            8<span className="text-muted-foreground">/11</span>
          </span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted">
          <div className="h-full w-[73%] rounded-full bg-gradient-to-r from-primary to-violet-500" />
        </div>
        <div className="mt-5 divide-y rounded-xl border bg-background/60">
          {rows.map((r) => (
            <div key={r.t} className="flex items-center gap-3 px-3.5 py-3 text-sm">
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
                  r.done ? 'border-easy bg-easy text-white' : 'border-input',
                )}
              >
                {r.done && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className={cn('flex-1 truncate', r.done && 'text-muted-foreground')}>
                {r.t}
              </span>
              <DifficultyBadge difficulty={r.d} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -right-4 -bottom-6 flex items-center gap-2.5 rounded-xl border bg-popover/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
        <span className="flex size-8 items-center justify-center rounded-lg bg-orange-500/12">
          <Flame className="size-4 text-orange-500" />
        </span>
        <span>
          <span className="block text-[11px] text-muted-foreground">Current streak</span>
          <span className="block text-sm font-semibold">16 days</span>
        </span>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel — theme-aware tint of the app background */}
      <aside className="relative hidden overflow-hidden border-r bg-[oklch(0.965_0.014_277)] p-10 lg:flex lg:flex-col xl:p-12 dark:bg-[oklch(0.135_0.016_272)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(42rem_28rem_at_15%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_70%),radial-gradient(34rem_24rem_at_100%_100%,color-mix(in_oklch,oklch(0.6_0.2_300)_16%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(40rem_30rem_at_30%_20%,black,transparent)] [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <Link to="/" className="relative w-fit" aria-label="DSA Sheet home">
          <Logo />
        </Link>
        <div className="relative my-auto py-12">
          <h2 className="max-w-md text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.035em]">
            Your DSA preparation, <span className="text-primary">organised.</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            200 curated problems, a study calendar that plans your weeks, and revisions scheduled
            before you forget.
          </p>
          <div className="mt-14 pl-4">
            <PreviewCard />
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} DSA Sheet
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-[380px] py-12 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <Link to="/" className="mb-10 inline-block lg:hidden" aria-label="DSA Sheet home">
            <Logo />
          </Link>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:hidden">
          © {new Date().getFullYear()} DSA Sheet
        </p>
      </div>
    </div>
  );
}
