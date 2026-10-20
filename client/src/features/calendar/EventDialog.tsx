import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, ExternalLink, History, RotateCcw, Trash2 } from 'lucide-react';
import { EVENT_TYPES, type CalendarEventDTO, type EventType } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { useProblemIndex, useProgress } from '@/features/sheet/hooks';
import { prettyDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { EVENT_META } from './eventMeta';
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from './hooks';

export type EventDialogState =
  | { mode: 'create'; date: string; startTime?: string; endTime?: string }
  | { mode: 'edit'; event: CalendarEventDTO }
  | null;

/** Create a new calendar entry or view / edit / complete / delete an existing one. */
export function EventDialog({ state, onClose }: { state: EventDialogState; onClose: () => void }) {
  const { list } = useProblemIndex();
  const { map } = useProgress();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();

  const editing = state?.mode === 'edit' ? state.event : null;
  const [title, setTitle] = useState('');
  const [problemId, setProblemId] = useState('');
  const [type, setType] = useState<EventType>('study');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!state) return;
    if (state.mode === 'create') {
      setTitle('');
      setProblemId('');
      setType('study');
      setDate(state.date);
      setStartTime(state.startTime ?? '');
      setEndTime(state.endTime ?? '');
      setNotes('');
    } else {
      const e = state.event;
      setTitle(e.title);
      setProblemId(e.problem?.id ?? '');
      setType(e.type);
      setDate(e.date);
      setStartTime(e.startTime ?? '');
      setEndTime(e.endTime ?? '');
      setNotes(e.notes);
    }
  }, [state]);

  // Problems grouped by chapter for the picker (unsolved first is implied by sheet order).
  const groups = useMemo(() => {
    const g = new Map<string, typeof list>();
    for (const ref of list) g.set(ref.chapter.title, [...(g.get(ref.chapter.title) ?? []), ref]);
    return [...g];
  }, [list]);

  const close = () => onClose();
  const pending = create.isPending || update.isPending;
  const times = startTime ? { startTime, endTime: endTime || startTime } : {};

  const save = () => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          title,
          type,
          date,
          notes,
          startTime: startTime || null,
          endTime: startTime ? endTime || startTime : null,
        },
        { onSuccess: close },
      );
    } else {
      create.mutate(
        {
          date,
          type,
          notes,
          ...(problemId ? { problemId } : {}),
          ...(title ? { title } : {}),
          ...times,
        },
        { onSuccess: close },
      );
    }
  };

  const canSave = !!date && (!!title.trim() || !!problemId);

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Study task' : 'New calendar entry'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `${EVENT_META[editing.type].label} · ${prettyDate(editing.date)}`
              : `Plan something for ${date ? prettyDate(date) : 'a day'}.`}
          </DialogDescription>
        </DialogHeader>

        {editing?.problem && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{editing.problem.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <DifficultyBadge difficulty={editing.problem.difficulty} />
                {map.get(editing.problem.id)?.status === 'solved' && (
                  <span className="inline-flex items-center gap-1 text-easy">
                    <CircleCheck className="size-3.5" /> Solved on the sheet
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={editing.problem.practiceUrl} target="_blank" rel="noopener noreferrer">
                Practice <ExternalLink />
              </a>
            </Button>
          </div>
        )}
        {editing?.rolledOverFrom && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <History className="size-3.5" /> Rolled over from {prettyDate(editing.rolledOverFrom)}
          </p>
        )}

        <div className="grid gap-4">
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="ev-problem">Problem (optional)</Label>
              <NativeSelect
                id="ev-problem"
                className="w-full"
                value={problemId}
                onChange={(e) => setProblemId(e.target.value)}
              >
                <option value="">— No problem, custom entry —</option>
                {groups.map(([chapter, refs]) => (
                  <optgroup key={chapter} label={chapter}>
                    {refs.map(({ problem }) => (
                      <option key={problem.id} value={problem.id}>
                        {map.get(problem.id)?.status === 'solved' ? '✓ ' : ''}
                        {problem.title} ({problem.difficulty})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ev-title">
              Title{' '}
              {problemId && !editing && (
                <span className="font-normal text-muted-foreground">
                  (defaults to problem title)
                </span>
              )}
            </Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={problemId ? '' : 'e.g. Weekly mock contest'}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition',
                    type === t
                      ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <span className={cn('size-2 rounded-full', EVENT_META[t].dot)} />
                  {EVENT_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-start">Start</Label>
              <Input
                id="ev-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">End</Label>
              <Input
                id="ev-end"
                type="time"
                value={endTime}
                min={startTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!startTime}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea
              id="ev-notes"
              rows={3}
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What do you want to focus on?"
            />
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {editing ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove.mutate(editing.id, { onSuccess: close })}
              >
                <Trash2 /> Delete
              </Button>
              {editing.status === 'done' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update.mutate({ id: editing.id, status: 'pending' }, { onSuccess: close })
                  }
                >
                  <RotateCcw /> Mark pending
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-easy"
                  onClick={() =>
                    update.mutate({ id: editing.id, status: 'done' }, { onSuccess: close })
                  }
                >
                  <CircleCheck /> Mark done
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave || pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add to calendar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
