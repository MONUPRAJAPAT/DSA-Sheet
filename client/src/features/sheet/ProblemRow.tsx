import { memo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, CircleDashed, Ellipsis, RotateCcw, Star, StickyNote } from 'lucide-react';
import type { ProblemDTO, ProgressDTO } from '@dsa/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { ResourceLinks } from '@/components/shared/ResourceLinks';
import { cn } from '@/lib/utils';
import { useTrackLastActive, useUpdateProgress } from './hooks';
import { useToggleSolved } from './useToggleSolved';
import { NotesDialog } from './NotesDialog';
import { ScheduleDialog } from './ScheduleDialog';

interface Props {
  problem: ProblemDTO;
  progress?: ProgressDTO;
  index: number;
  highlighted?: boolean;
}

export const ProblemRow = memo(function ProblemRow({
  problem,
  progress,
  index,
  highlighted,
}: Props) {
  const update = useUpdateProgress();
  const toggleSolved = useToggleSolved();
  const track = useTrackLastActive();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const solved = progress?.status === 'solved';
  const attempted = progress?.status === 'attempted';
  const starred = !!progress?.starred;
  const hasNotes = !!progress?.notes;

  return (
    <div
      id={`problem-${problem.id}`}
      className={cn(
        'group grid scroll-mt-28 grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:px-5',
        solved && 'bg-easy-soft/30',
        highlighted &&
          'animate-[pulse_1s_ease-in-out_2] bg-primary/10 ring-2 ring-primary/40 ring-inset',
      )}
    >
      <Checkbox
        ref={checkboxRef}
        checked={solved}
        onCheckedChange={(v) => toggleSolved(problem.id, !!v, checkboxRef.current)}
        aria-label={`Mark ${problem.title} as ${solved ? 'not solved' : 'solved'}`}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="hidden w-6 shrink-0 text-xs font-medium text-muted-foreground tabular-nums sm:inline">
            {index}.
          </span>
          <a
            href={problem.resources.practice.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track.mutate(problem.id)}
            className={cn(
              'truncate text-sm font-medium hover:text-primary hover:underline underline-offset-4',
              solved && 'text-muted-foreground',
            )}
          >
            {problem.title}
          </a>
          {attempted && (
            <Tooltip content="Attempted — not solved yet">
              <CircleDashed className="size-3.5 shrink-0 text-medium" />
            </Tooltip>
          )}
          {hasNotes && (
            <Tooltip content={progress!.notes.slice(0, 120)}>
              <StickyNote className="size-3.5 shrink-0 text-muted-foreground" />
            </Tooltip>
          )}
        </div>
      </div>

      <DifficultyBadge
        difficulty={problem.difficulty}
        className="justify-self-end sm:w-16 sm:justify-center"
      />

      <ResourceLinks
        resources={problem.resources}
        onOpen={() => track.mutate(problem.id)}
        className="col-start-2 row-start-2 -ml-2 sm:col-start-auto sm:row-start-auto sm:ml-0"
      />

      <div className="col-start-3 row-start-2 flex items-center justify-end gap-0.5 sm:col-start-auto sm:row-start-auto">
        <Tooltip content={starred ? 'Remove star' : 'Star for later'}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={starred}
            aria-label="Star problem"
            onClick={() => update.mutate({ problemId: problem.id, starred: !starred })}
          >
            <Star
              className={cn(
                'size-4',
                starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground',
              )}
            />
          </Button>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More actions">
              <Ellipsis className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setNotesOpen(true)}>
              <StickyNote /> {hasNotes ? 'Edit notes' : 'Add notes'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setScheduleOpen(true)}>
              <CalendarPlus /> Add to calendar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!attempted && !solved && (
              <DropdownMenuItem
                onSelect={() =>
                  update.mutate(
                    { problemId: problem.id, status: 'attempted' },
                    {
                      onSuccess: () =>
                        toast('Marked as attempted', {
                          description: 'It stays on your list until you solve it.',
                        }),
                    },
                  )
                }
              >
                <CircleDashed /> Mark as attempted
              </DropdownMenuItem>
            )}
            {(attempted || solved) && (
              <DropdownMenuItem
                onSelect={() =>
                  update.mutate(
                    { problemId: problem.id, status: 'todo' },
                    { onSuccess: () => toast('Status reset', { description: problem.title }) },
                  )
                }
              >
                <RotateCcw /> Reset status
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        problemId={problem.id}
        title={problem.title}
        initial={progress?.notes ?? ''}
      />
      {scheduleOpen && (
        <ScheduleDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          problemId={problem.id}
          title={problem.title}
        />
      )}
    </div>
  );
});
