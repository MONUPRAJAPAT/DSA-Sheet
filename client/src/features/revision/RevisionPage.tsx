import { useMemo } from 'react';
import { usePageTitle } from '@/lib/usePageTitle';
import { Link } from 'react-router';
import { Brain, CalendarDays, PartyPopper } from 'lucide-react';
import { REVISION_INTERVALS_DAYS } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader } from '@/components/shared/States';
import { AgendaList } from '@/features/dashboard/AgendaList';
import { useAgenda } from '@/features/dashboard/hooks';
import { useEvents } from '@/features/calendar/hooks';
import { addDaysKey, prettyDate, todayKey } from '@/lib/dates';
import { pluralize } from '@/lib/utils';

/** "Revisit" part of the learning loop: spaced-repetition revisions due now and coming up. */
export function RevisionPage() {
  usePageTitle('Revision');
  const agenda = useAgenda();
  const today = todayKey();
  const upcoming = useEvents(addDaysKey(today, 1), addDaysKey(today, 14));

  const due = useMemo(
    () =>
      [...(agenda.data?.overdue ?? []), ...(agenda.data?.events ?? [])].filter(
        (e) => e.type === 'revision',
      ),
    [agenda.data],
  );
  const pendingDue = due.filter((e) => e.status === 'pending').length;
  const nextDays = useMemo(() => {
    const groups = new Map<string, number>();
    (upcoming.data ?? [])
      .filter((e) => e.type === 'revision' && e.status === 'pending')
      .forEach((e) => groups.set(e.date, (groups.get(e.date) ?? 0) + 1));
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming.data]);

  return (
    <>
      <PageHeader
        title="Revision"
        description="Revisit solved problems at 1, 3, 7 and 21 days — the spacing that moves patterns into long-term memory."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Due today</CardTitle>
            <CardDescription>
              {agenda.data
                ? pendingDue
                  ? `${pluralize(pendingDue, 'revision')} waiting`
                  : 'All caught up'
                : ' '}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agenda.isPending ? (
              <Skeleton className="h-48" />
            ) : (
              <AgendaList
                events={due}
                empty={
                  <EmptyState
                    icon={PartyPopper}
                    title="No revisions due"
                    description="Solve a problem on the sheet and its revisions are scheduled automatically."
                    action={
                      <Button size="sm" asChild>
                        <Link to="/sheet">Open the sheet</Link>
                      </Button>
                    }
                  />
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-4 text-revision" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-5 text-sm">
                {REVISION_INTERVALS_DAYS.map((d, i) => (
                  <li key={d} className="relative">
                    <span className="absolute top-0.5 -left-[27px] flex size-3.5 items-center justify-center rounded-full border-2 border-revision bg-card" />
                    <p className="font-medium">
                      Revision {i + 1} · Day +{d}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {
                        [
                          'Re-solve from memory',
                          'Explain the approach out loud',
                          'Solve a variant under time',
                          'Final check — pattern locked in',
                        ][i]
                      }
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" /> Next 14 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextDays.length ? (
                <ul className="space-y-2 text-sm">
                  {nextDays.map(([date, n]) => (
                    <li key={date} className="flex items-center justify-between">
                      <span>{prettyDate(date)}</span>
                      <span className="rounded-md bg-revision/10 px-2 py-0.5 text-xs font-semibold text-revision">
                        {pluralize(n, 'revision')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
