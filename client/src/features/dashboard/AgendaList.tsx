import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock, ChevronDown, ExternalLink, History } from 'lucide-react';
import { toast } from 'sonner';
import type { CalendarEventDTO } from '@dsa/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { EmptyState } from '@/components/shared/States';
import { useUpdateEvent } from '@/features/calendar/hooks';
import { EVENT_META } from '@/features/calendar/eventMeta';
import { celebrate, originOf } from '@/lib/celebrate';
import { prettyDate } from '@/lib/dates';
import { cn, percent } from '@/lib/utils';

const COLLAPSED = 6;

/** Checklist of calendar tasks (dashboard + revision page): pending first, progress on top, undo on every change. */
export function AgendaList({
  events,
  empty,
}: {
  events: CalendarEventDTO[];
  empty?: React.ReactNode;
}) {
  const update = useUpdateEvent();
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  if (!events.length)
    return (
      empty ?? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing planned for today"
          description="Generate a study plan or drag problems onto the calendar."
          action={
            <Button size="sm" asChild>
              <Link to="/calendar?plan=1">Plan my week</Link>
            </Button>
          }
        />
      )
    );

  // Overdue first, then pending, then completed.
  const rank = (e: CalendarEventDTO) => (e.overdue ? 0 : e.status === 'pending' ? 1 : 2);
  const sorted = [...events].sort((a, b) => rank(a) - rank(b));
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED);
  const done = events.filter((e) => e.status === 'done').length;

  const toggle = (e: CalendarEventDTO, checked: boolean, el: Element | null) => {
    update.mutate(
      { id: e.id, status: checked ? 'done' : 'pending' },
      {
        onSuccess: () => {
          const undo = {
            label: 'Undo',
            onClick: () => update.mutate({ id: e.id, status: e.status }),
          };
          if (!checked)
            return toast('Moved back to pending', { description: e.title, action: undo });
          const remaining = events.filter((x) => x.id !== e.id && x.status === 'pending').length;
          if (remaining === 0 && events.length > 1) {
            celebrate('medium', originOf(el));
            toast.success('Everything on today’s list is done 🎉', {
              description: 'Take a break — you earned it.',
              action: undo,
            });
          } else {
            toast.success(`Done: ${e.title}`, {
              description: `${remaining} left for today`,
              action: undo,
            });
          }
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Progress value={percent(done, events.length)} barClassName="bg-easy" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
          {done}/{events.length} done
        </span>
      </div>
      <ul ref={listRef} className="divide-y overflow-hidden rounded-lg border">
        {visible.map((e) => {
          const meta = EVENT_META[e.type];
          const isDone = e.status === 'done';
          return (
            <li
              key={e.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30',
                isDone && 'bg-muted/20',
              )}
            >
              <Checkbox
                checked={isDone}
                onCheckedChange={(v) =>
                  toggle(e, !!v, listRef.current?.querySelector(`[data-ev="${e.id}"]`) ?? null)
                }
                data-ev={e.id}
                aria-label={`Mark ${e.title} ${isDone ? 'not done' : 'done'}`}
              />
              <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    isDone && 'text-muted-foreground line-through',
                  )}
                >
                  {e.title}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {meta.label}
                  {e.startTime && <> · {e.startTime}</>}
                  {e.overdue && (
                    <span className="inline-flex items-center gap-1 font-medium text-hard">
                      <History className="size-3" /> overdue since {prettyDate(e.date)}
                    </span>
                  )}
                </p>
              </div>
              {e.problem && (
                <DifficultyBadge
                  difficulty={e.problem.difficulty}
                  className="hidden sm:inline-flex"
                />
              )}
              {e.problem && (
                <Tooltip content="Open problem">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={e.problem.practiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${e.problem.title}`}
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ul>
      {sorted.length > COLLAPSED && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? 'Show less' : `Show all ${sorted.length} tasks`}
          <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
        </Button>
      )}
    </div>
  );
}
