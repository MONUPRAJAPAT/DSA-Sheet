import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProgressDTO, TopicDTO } from '@dsa/shared';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { ResourceLinks } from '@/components/shared/ResourceLinks';
import { cn, percent } from '@/lib/utils';
import { ProblemRow } from './ProblemRow';
import { matches, type Filters } from './filters';

interface Props {
  topic: TopicDTO;
  number: number;
  progress: Map<string, ProgressDTO>;
  filters: Filters;
  highlightId?: string | null;
  startIndex: number;
}

export function TopicSection({ topic, number, progress, filters, highlightId, startIndex }: Props) {
  const containsHighlight = !!highlightId && topic.problems.some((p) => p.id === highlightId);
  const [open, setOpen] = useState(true);
  const expanded = open || containsHighlight;

  const solved = topic.problems.filter((p) => progress.get(p.id)?.status === 'solved').length;
  const visible = topic.problems
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => matches(p, progress.get(p.id), filters));
  if (visible.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
        <button
          onClick={() => setOpen(!expanded)}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{topic.title}</span>
              <DifficultyBadge difficulty={topic.difficulty} />
            </span>
            {topic.description && (
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {topic.description}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'mt-1 size-4 shrink-0 text-muted-foreground transition-transform sm:hidden',
              !expanded && '-rotate-90',
            )}
          />
        </button>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 px-1 py-0.5">
            <span className="px-1.5 text-[11px] font-medium text-muted-foreground">Learn</span>
            <ResourceLinks resources={topic.resources} />
          </div>
          <div className="w-24">
            <div className="mb-1 text-right text-xs font-medium tabular-nums">
              {solved}/{topic.problems.length}
            </div>
            <Progress value={percent(solved, topic.problems.length)} barClassName="bg-easy" />
          </div>
          <button
            onClick={() => setOpen(!expanded)}
            className="hidden cursor-pointer rounded-md p-1 hover:bg-muted sm:block"
            aria-label={expanded ? 'Collapse topic' : 'Expand topic'}
          >
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                !expanded && '-rotate-90',
              )}
            />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="divide-y border-t">
          {visible.map(({ p, i }) => (
            <ProblemRow
              key={p.id}
              problem={p}
              progress={progress.get(p.id)}
              index={startIndex + i + 1}
              highlighted={p.id === highlightId}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
