import { Search, X } from 'lucide-react';
import { DIFFICULTIES } from '@dsa/shared';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { defaultFilters, isFiltering, type Filters, type StatusFilter } from './filters';

const dot = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' } as const;

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Filter problems in this chapter…"
          className="h-9 pl-9"
          aria-label="Filter problems"
        />
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 items-center rounded-lg border bg-card p-0.5 shadow-xs"
          role="group"
          aria-label="Difficulty"
        >
          {(['all', ...DIFFICULTIES] as const).map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...filters, difficulty: d })}
              aria-pressed={filters.difficulty === d}
              className={cn(
                'flex h-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition',
                filters.difficulty === d && 'bg-muted text-foreground',
              )}
            >
              {d !== 'all' && <span className={cn('size-1.5 rounded-full', dot[d])} />}
              {d === 'all' ? 'All' : d}
            </button>
          ))}
        </div>
        <NativeSelect
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as StatusFilter })}
          aria-label="Status"
        >
          <option value="all">All status</option>
          <option value="unsolved">Unsolved</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="starred">Starred</option>
        </NativeSelect>
        {isFiltering(filters) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(defaultFilters)}
            aria-label="Clear filters"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
