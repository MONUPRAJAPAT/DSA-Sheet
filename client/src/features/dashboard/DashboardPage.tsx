import { Link } from 'react-router';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  PartyPopper,
  Play,
  Repeat,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { DIFFICULTIES, type StatsDTO } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Heatmap } from '@/components/shared/Heatmap';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { ErrorState } from '@/components/shared/States';
import { DifficultyBadge, difficultyBg, difficultyText } from '@/components/shared/DifficultyBadge';
import { useProblemIndex, useSheet, useSolvedToday } from '@/features/sheet/hooks';
import { usePlan } from '@/features/calendar/hooks';
import { useAuth } from '@/stores/auth';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn, percent, pluralize } from '@/lib/utils';
import { AgendaList } from './AgendaList';
import { useAgenda, useHeatmap, useStats } from './hooks';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  footer,
}: {
  icon: typeof Flame;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  tone: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </Card>
  );
}

/** Three-step checklist that turns a brand-new account into an active learner. */
function GettingStarted({
  stats,
  firstProblemHref,
}: {
  stats: StatsDTO;
  firstProblemHref: string;
}) {
  const userId = useAuth((s) => s.user?.id);
  const plan = usePlan();
  const key = `onboarding-dismissed:${userId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });

  const steps = [
    {
      done: stats.solved > 0,
      title: 'Solve your first problem',
      text: 'Watch the video, practise, then tick the box.',
      href: firstProblemHref,
      cta: 'Start',
    },
    {
      done: !!plan.data,
      title: 'Generate your study plan',
      text: 'Pick a target date — we schedule the rest.',
      href: '/calendar?plan=1',
      cta: 'Plan',
    },
    {
      done: stats.streak.longest >= 3,
      title: 'Build a 3-day streak',
      text: 'Solve at least one problem three days in a row.',
      href: '/sheet',
      cta: 'Go',
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  if (dismissed || completed === steps.length || plan.isPending) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* private mode */
    }
    setDismissed(true);
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Getting started
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
            Set yourself up for success
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed} of {steps.length} complete
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="Dismiss getting started"
        >
          <X className="size-4 text-muted-foreground" />
        </Button>
      </div>
      <Progress value={percent(completed, steps.length)} className="mx-5 mt-4 w-auto sm:mx-6" />
      <ol className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={cn(
              'flex flex-col rounded-xl border p-4 transition-colors',
              s.done ? 'bg-easy-soft/40' : 'bg-muted/30',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  s.done ? 'bg-easy text-white' : 'border bg-card text-muted-foreground',
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  s.done && 'text-muted-foreground line-through',
                )}
              >
                {s.title}
              </span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
            {!s.done && (
              <Button size="sm" variant="outline" className="mt-3 self-start" asChild>
                <Link to={s.href}>
                  {s.cta} <ArrowRight />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const user = useAuth((s) => s.user)!;
  const stats = useStats();
  const heatmap = useHeatmap();
  const agenda = useAgenda();
  const sheet = useSheet();
  const solvedToday = useSolvedToday();
  const { byId } = useProblemIndex();

  if (stats.isError)
    return <ErrorState message={stats.error.message} onRetry={() => stats.refetch()} />;
  const s = stats.data;
  const goal = user.preferences.dailyGoal;
  const cont = s?.continue ? byId.get(s.continue.problemId) : undefined;
  const isNew = s?.solved === 0;
  const todayTasks = agenda.data?.events ?? [];
  const overdue = agenda.data?.overdue ?? [];
  const contHref = cont ? `/sheet/${cont.chapter.slug}?problem=${cont.problem.id}` : '/sheet';

  const subtitle = !s
    ? 'Loading your progress…'
    : isNew
      ? 'Welcome to DSA Sheet — let’s solve your first problem.'
      : solvedToday >= goal
        ? 'Daily goal reached — great work today. Revisions keep it fresh.'
        : s.revisionsDue
          ? `${pluralize(s.revisionsDue, 'revision')} due and ${goal - solvedToday} more to hit today’s goal.`
          : `${pluralize(goal - solvedToday, 'more problem')} to hit today’s goal.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs sm:self-auto">
          <CalendarDays className="size-3.5" /> {format(new Date(), 'EEEE, d MMMM')}
        </span>
      </div>

      {s && isNew && <GettingStarted stats={s} firstProblemHref={contHref} />}

      {/* Resume exactly where you left off */}
      {!s ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : cont ? (
        <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card">
          <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                {isNew ? 'Start here' : 'Continue where you left off'}
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {cont.problem.title}
                </h2>
                <DifficultyBadge difficulty={cont.problem.difficulty} />
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                Chapter {cont.chapter.order} · {cont.chapter.title} › {cont.topic.title}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="bg-card">
                <a href={cont.problem.resources.youtube} target="_blank" rel="noopener noreferrer">
                  <Play /> Watch video
                </a>
              </Button>
              <Button asChild>
                <Link to={contHref}>
                  {isNew ? 'Start' : 'Resume'} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex items-center gap-4 p-6">
          <PartyPopper className="size-8 text-primary" />
          <div>
            <p className="font-semibold">You’ve solved every problem in the sheet!</p>
            <p className="text-sm text-muted-foreground">
              Keep revising — your revision queue keeps the knowledge fresh.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {!s ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : (
          <>
            <StatTile
              icon={Trophy}
              label="Problems solved"
              value={
                <>
                  {s.solved}
                  <span className="text-lg text-muted-foreground">/{s.total}</span>
                </>
              }
              hint={`${percent(s.solved, s.total)}% of the sheet complete`}
              tone="bg-primary/10 text-primary"
              footer={<Progress value={percent(s.solved, s.total)} />}
            />
            <StatTile
              icon={Flame}
              label="Current streak"
              value={pluralize(s.streak.current, 'day')}
              hint={
                s.streak.current === 0
                  ? 'Solve a problem today to start one'
                  : solvedToday === 0
                    ? 'Solve one today to keep it going'
                    : `Longest: ${pluralize(s.streak.longest, 'day')}`
              }
              tone="bg-orange-500/10 text-orange-500"
            />
            <StatTile
              icon={Repeat}
              label="Revisions due"
              value={s.revisionsDue}
              hint={s.revisionsDue ? 'Revise them while they’re fresh' : 'All caught up'}
              tone="bg-revision/10 text-revision"
              footer={
                s.revisionsDue > 0 && (
                  <Link
                    to="/revision"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-revision hover:underline"
                  >
                    Review now <ArrowRight className="size-3" />
                  </Link>
                )
              }
            />
            <StatTile
              icon={Target}
              label="Solved today"
              value={
                <>
                  {solvedToday}
                  <span className="text-lg text-muted-foreground">/{goal}</span>
                </>
              }
              hint={solvedToday >= goal ? 'Daily goal reached 🎯' : 'Your daily goal'}
              tone="bg-easy-soft text-easy"
              footer={
                <Progress
                  value={percent(Math.min(solvedToday, goal), goal)}
                  barClassName="bg-easy"
                />
              }
            />
          </>
        )}
      </div>

      {/* Two independent columns so cards never leave gaps */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Today’s agenda</CardTitle>
                <CardDescription>
                  {agenda.data
                    ? `${pluralize(todayTasks.length, 'task')} planned${overdue.length ? ` · ${overdue.length} overdue` : ''}`
                    : ' '}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/calendar">
                  <CalendarDays /> Open calendar
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {agenda.isPending ? (
                <Skeleton className="h-40" />
              ) : (
                <AgendaList events={[...overdue, ...todayTasks]} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Problems solved per day</CardDescription>
              </div>
              {s && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Flame className="size-3.5 text-orange-500" /> Longest streak{' '}
                  {pluralize(s.streak.longest, 'day')}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {heatmap.data ? <Heatmap data={heatmap.data} /> : <Skeleton className="h-28" />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Difficulty breakdown</CardTitle>
              <CardDescription>Solved vs. total per level</CardDescription>
            </CardHeader>
            <CardContent>
              {!s ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <ProgressRing value={percent(s.solved, s.total)} size={128} stroke={10}>
                    <span className="text-2xl font-semibold tabular-nums">
                      {percent(s.solved, s.total)}%
                    </span>
                    <span className="text-xs text-muted-foreground">complete</span>
                  </ProgressRing>
                  <div className="w-full space-y-3">
                    {DIFFICULTIES.map((d) => {
                      const v = s.byDifficulty[d];
                      return (
                        <div key={d}>
                          <div className="mb-1.5 flex justify-between text-sm">
                            <span className={cn('font-medium', difficultyText[d])}>{d}</span>
                            <span className="text-muted-foreground tabular-nums">
                              <span className="font-semibold text-foreground">{v.solved}</span> /{' '}
                              {v.total}
                            </span>
                          </div>
                          <Progress
                            value={percent(v.solved, v.total)}
                            barClassName={difficultyBg[d]}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Chapter progress</CardTitle>
            <CardDescription>Jump back into any chapter</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sheet">View sheet</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!s || !sheet.data ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {sheet.data.chapters.map((c) => {
                const v = s.byChapter.find((b) => b.chapterId === c.id) ?? {
                  solved: 0,
                  total: c.problemCount,
                };
                const done = v.total > 0 && v.solved === v.total;
                return (
                  <Link key={c.id} to={`/sheet/${c.slug}`} className="group block rounded-lg">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground">
                          {String(c.order).padStart(2, '0')}
                        </span>
                        <span className="truncate font-medium transition-colors group-hover:text-primary">
                          {c.title}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums',
                          done && 'text-easy',
                        )}
                      >
                        {done && <Check className="size-3" strokeWidth={3} />}
                        {v.solved}/{v.total}
                      </span>
                    </div>
                    <Progress
                      value={percent(v.solved, v.total)}
                      barClassName={done ? 'bg-easy' : undefined}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
