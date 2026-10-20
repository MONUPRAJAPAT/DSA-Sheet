import { Link } from 'react-router';
import { usePageTitle } from '@/lib/usePageTitle';
import { ArrowRight, CircleCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { useStats } from '@/features/dashboard/hooks';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, PageHeader } from '@/components/shared/States';
import { cn, percent } from '@/lib/utils';
import { useProblemIndex, useProgress, useSheet } from './hooks';
import { chapterIcon } from './icons';

export function SheetPage() {
  usePageTitle('DSA Sheet');
  const sheet = useSheet();
  const { data: stats } = useStats();
  const { byId } = useProblemIndex();
  const cont = stats?.continue ? byId.get(stats.continue.problemId) : undefined;
  const { map } = useProgress();

  if (sheet.isError)
    return <ErrorState message={sheet.error.message} onRetry={() => sheet.refetch()} />;

  const totals = sheet.data?.totals;
  const solvedTotal = [...map.values()].filter((p) => p.status === 'solved').length;

  return (
    <>
      <PageHeader
        title="DSA Sheet"
        description={
          totals ? (
            <>
              {sheet.data!.chapters.length} chapters ·{' '}
              {sheet.data!.chapters.reduce((n, c) => n + c.topics.length, 0)} topics ·{' '}
              {totals.problems} problems — <span className="text-easy">{totals.easy} Easy</span>,{' '}
              <span className="text-medium">{totals.medium} Medium</span>,{' '}
              <span className="text-hard">{totals.hard} Hard</span>
            </>
          ) : (
            'Loading…'
          )
        }
        actions={
          totals && (
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2 shadow-xs">
              <CircleCheck className="size-5 text-easy" />
              <div className="text-sm">
                <span className="font-semibold">{solvedTotal}</span>
                <span className="text-muted-foreground"> / {totals.problems} solved</span>
              </div>
              <Progress
                value={percent(solvedTotal, totals.problems)}
                className="w-24"
                barClassName="bg-easy"
              />
            </div>
          )
        }
      />

      {cont && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Play className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {stats?.solved ? 'Continue where you left off' : 'Start with'}
            </p>
            <p className="flex items-center gap-2 truncate text-sm font-semibold">
              <span className="truncate">{cont.problem.title}</span>
              <DifficultyBadge difficulty={cont.problem.difficulty} />
              <span className="hidden truncate font-normal text-muted-foreground sm:inline">
                · {cont.chapter.title} › {cont.topic.title}
              </span>
            </p>
          </div>
          <Button size="sm" asChild>
            <Link to={`/sheet/${cont.chapter.slug}?problem=${cont.problem.id}`}>
              {stats?.solved ? 'Resume' : 'Start'} <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sheet.isPending &&
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        {sheet.data?.chapters.map((chapter) => {
          const Icon = chapterIcon(chapter.icon);
          const ids = chapter.topics.flatMap((t) => t.problems);
          const solved = ids.filter((p) => map.get(p.id)?.status === 'solved').length;
          const pct = percent(solved, ids.length);
          const counts = { Easy: 0, Medium: 0, Hard: 0 };
          ids.forEach((p) => counts[p.difficulty]++);
          return (
            <Link key={chapter.id} to={`/sheet/${chapter.slug}`} className="group outline-none">
              <Card className="relative h-full overflow-hidden p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md group-focus-visible:ring-[3px] group-focus-visible:ring-ring/40">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary',
                      pct === 100 && 'bg-easy-soft text-easy',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Chapter {chapter.order}
                  </span>
                </div>
                <h2 className="mt-4 text-[17px] font-semibold tracking-tight">{chapter.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {chapter.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{chapter.topics.length} topics</span>
                  <span className="size-1 rounded-full bg-border" />
                  <span>
                    <span className="text-easy">{counts.Easy}E</span> ·{' '}
                    <span className="text-medium">{counts.Medium}M</span> ·{' '}
                    <span className="text-hard">{counts.Hard}H</span>
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={pct} barClassName={pct === 100 ? 'bg-easy' : undefined} />
                  <span className="w-20 text-right text-xs font-semibold tabular-nums">
                    {solved}/{ids.length}
                  </span>
                </div>
                <ArrowRight className="absolute right-5 bottom-14 size-4 -translate-x-1 text-primary opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
