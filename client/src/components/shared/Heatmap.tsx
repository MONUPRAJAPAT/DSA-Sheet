import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HeatmapDay } from '@dsa/shared';
import { format } from 'date-fns';
import { Tooltip } from '@/components/ui/tooltip';
import { toKey } from '@/lib/dates';
import { cn, pluralize } from '@/lib/utils';

const LEVELS = ['bg-muted', 'bg-primary/25', 'bg-primary/45', 'bg-primary/70', 'bg-primary'];
const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
const CELL = 12;
const GAP = 3;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/** GitHub-style activity heatmap that fits as many weeks as its container allows (max one year). */
export function Heatmap({ data }: { data: HeatmapDay[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(26);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setWeeks(Math.max(8, Math.min(53, Math.floor((el.clientWidth - 30 + GAP) / (CELL + GAP)))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const counts = useMemo(() => new Map(data.map((d) => [d.date, d.count])), [data]);
  const columns = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    start.setDate(start.getDate() - start.getDay()); // align the first column to Sunday
    const cols: Date[][] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || !cols.length) cols.push([]);
      cols.at(-1)!.push(new Date(d));
    }
    return cols;
  }, [weeks]);

  const visibleFrom = toKey(columns[0]?.[0] ?? new Date());
  const total = data.filter((d) => d.date >= visibleFrom).reduce((n, d) => n + d.count, 0);
  // Label a column with the month that starts in it (never the last column, where it would be clipped).
  const months = columns.map((col, i) => {
    const firstOfMonth = col.find((d) => d.getDate() === 1);
    return firstOfMonth && i < columns.length - 2 ? format(firstOfMonth, 'MMM') : '';
  });

  return (
    <div ref={ref}>
      <div className="flex gap-[3px] pl-[30px] text-[10px] text-muted-foreground" aria-hidden>
        {months.map((m, i) => (
          <span key={i} className="w-3 shrink-0 overflow-visible whitespace-nowrap">
            {m}
          </span>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        <div
          className="flex w-[27px] shrink-0 flex-col gap-[3px] text-[10px] leading-3 text-muted-foreground"
          aria-hidden
        >
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="h-3">
              {d}
            </span>
          ))}
        </div>
        {columns.map((col) => (
          <div key={toKey(col[0]!)} className="flex flex-col gap-[3px]">
            {col.map((day) => {
              const key = toKey(day);
              const n = counts.get(key) ?? 0;
              return (
                <Tooltip
                  key={key}
                  content={`${n ? pluralize(n, 'problem') : 'No problems'} solved · ${format(day, 'EEE, d MMM yyyy')}`}
                >
                  <span
                    className={cn(
                      'size-3 rounded-[3px] transition-colors hover:ring-1 hover:ring-foreground/30',
                      LEVELS[level(n)],
                    )}
                  />
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">{total}</span> solved in the
          last {Math.max(1, Math.round(weeks / 4.35))} months
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((c) => (
            <span key={c} className={cn('size-2.5 rounded-[2px]', c)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
