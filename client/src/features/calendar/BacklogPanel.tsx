import { useEffect, useMemo, useRef, useState } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { GripVertical, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProblemIndex, useProgress } from '@/features/sheet/hooks';
import { cn } from '@/lib/utils';
import { difficultyBg } from '@/components/shared/DifficultyBadge';

/** Unsolved problems that can be dragged straight onto a calendar day. */
export function BacklogPanel({ scheduledIds }: { scheduledIds: Set<string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { list } = useProblemIndex();
  const { map } = useProgress();
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.toLowerCase();
    return list
      .filter(({ problem }) => map.get(problem.id)?.status !== 'solved')
      .filter(
        ({ problem, chapter }) =>
          !query ||
          problem.title.toLowerCase().includes(query) ||
          chapter.title.toLowerCase().includes(query),
      )
      .slice(0, 40);
  }, [list, map, q]);

  useEffect(() => {
    if (!ref.current) return;
    const d = new Draggable(ref.current, {
      itemSelector: '[data-problem-id]',
      eventData: (el) => ({ title: el.dataset.title, create: false, duration: '01:00' }),
    });
    return () => d.destroy();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a problem…"
          className="h-9 pl-9"
        />
      </div>
      <div
        ref={ref}
        className="-mx-1 max-h-[560px] flex-1 space-y-1 overflow-y-auto px-1 scrollbar-thin"
      >
        {items.map(({ problem, chapter }) => (
          <div
            key={problem.id}
            data-problem-id={problem.id}
            data-title={problem.title}
            className="group flex cursor-grab items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-xs transition hover:border-primary/40 hover:shadow-sm active:cursor-grabbing"
          >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
            <span
              className={cn('size-1.5 shrink-0 rounded-full', difficultyBg[problem.difficulty])}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{problem.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {chapter.title}
              </span>
            </span>
            {scheduledIds.has(problem.id) && (
              <span className="rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                planned
              </span>
            )}
          </div>
        ))}
        {!items.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No unsolved problems match.
          </p>
        )}
      </div>
    </div>
  );
}
