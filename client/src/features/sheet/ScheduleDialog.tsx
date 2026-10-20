import { useState } from 'react';
import { toast } from 'sonner';
import type { EventType } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { useCreateEvent } from '@/features/calendar/hooks';
import { addDaysKey, prettyDate, todayKey } from '@/lib/dates';

/** Put a problem on the study calendar for a specific day (and optional time). */
export function ScheduleDialog({
  open,
  onOpenChange,
  problemId,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  problemId: string;
  title: string;
}) {
  const [date, setDate] = useState(addDaysKey(todayKey(), 1));
  const [time, setTime] = useState('');
  const [type, setType] = useState<EventType>('study');
  const create = useCreateEvent();

  const submit = () =>
    create.mutate(
      { problemId, date, type, ...(time ? { startTime: time, endTime: time } : {}) },
      {
        onSuccess: () => {
          toast.success(`Scheduled for ${prettyDate(date)}`, { description: title });
          onOpenChange(false);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to study calendar</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 7].map((d) => {
            const key = addDaysKey(todayKey(), d);
            return (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={date === key ? 'default' : 'outline'}
                onClick={() => setDate(key)}
              >
                {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === 7 ? 'Next week' : prettyDate(key)}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sched-date">Date</Label>
            <Input
              id="sched-date"
              type="date"
              value={date}
              min={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-time">Time (optional)</Label>
            <Input
              id="sched-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sched-type">Type</Label>
          <NativeSelect
            id="sched-type"
            className="w-full"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            <option value="study">Study (first attempt)</option>
            <option value="revision">Revision</option>
          </NativeSelect>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!date || create.isPending}>
            {create.isPending ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
