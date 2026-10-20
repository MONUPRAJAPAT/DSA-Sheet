import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CircleCheck, Minus, Plus, TriangleAlert, WandSparkles } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useProgress, useSheet } from '@/features/sheet/hooks';
import { useAuth } from '@/stores/auth';
import { addDaysKey, fromKey, prettyDate, todayKey, WEEKDAY_LABELS } from '@/lib/dates';
import { cn, pluralize } from '@/lib/utils';
import { useGeneratePlan } from './hooks';

/**
 * Auto study-plan wizard: pick a target date, a daily goal and study days. The preview shows
 * live whether the remaining problems fit, before anything is written to the calendar.
 */
export function PlanWizardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const prefs = useAuth((s) => s.user?.preferences);
  const { data: sheet } = useSheet();
  const { map } = useProgress();
  const generate = useGeneratePlan();

  const [startDate, setStartDate] = useState(todayKey());
  const [targetDate, setTargetDate] = useState(
    prefs?.targetDate && prefs.targetDate > todayKey()
      ? prefs.targetDate
      : addDaysKey(todayKey(), 60),
  );
  const [dailyGoal, setDailyGoal] = useState(prefs?.dailyGoal ?? 3);
  const [studyDays, setStudyDays] = useState<number[]>(prefs?.studyDays ?? [1, 2, 3, 4, 5, 6]);
  const [chapterIds, setChapterIds] = useState<string[] | null>(null); // null = all chapters

  const preview = useMemo(() => {
    const chapters = (sheet?.chapters ?? []).filter(
      (c) => !chapterIds || chapterIds.includes(c.id),
    );
    const remaining = chapters
      .flatMap((c) => c.topics.flatMap((t) => t.problems))
      .filter((p) => map.get(p.id)?.status !== 'solved').length;
    let days = 0;
    for (let d = startDate; d <= targetDate && days < 400; d = addDaysKey(d, 1))
      if (studyDays.includes(fromKey(d).getDay())) days++;
    const capacity = days * dailyGoal;
    return {
      remaining,
      days,
      capacity,
      fits: capacity >= remaining,
      needed: days ? Math.ceil(remaining / days) : remaining,
    };
  }, [sheet, map, chapterIds, startDate, targetDate, studyDays, dailyGoal]);

  const toggleDay = (d: number) =>
    setStudyDays((s) =>
      s.includes(d) ? (s.length > 1 ? s.filter((x) => x !== d) : s) : [...s, d].sort(),
    );
  const toggleChapter = (id: string) => {
    const all = sheet?.chapters.map((c) => c.id) ?? [];
    const current = chapterIds ?? all;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setChapterIds(next.length === all.length ? null : next);
  };

  const submit = () =>
    generate.mutate(
      { startDate, targetDate, dailyGoal, studyDays, ...(chapterIds ? { chapterIds } : {}) },
      {
        onSuccess: (r) => {
          toast.success(`Study plan ready — ${pluralize(r.created, 'problem')} scheduled`, {
            description: r.fitsBeforeTarget
              ? `From ${prettyDate(r.firstDate ?? startDate)} to ${prettyDate(r.lastDate ?? targetDate)}`
              : `${r.unscheduled} didn’t fit — try ${r.suggestedDailyGoal}/day to finish by your target.`,
          });
          onOpenChange(false);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="size-5 text-primary" /> Generate my study plan
          </DialogTitle>
          <DialogDescription>
            We spread your unsolved problems across your study days in sheet order (easy → hard
            within each topic). Existing auto-plan tasks from the start date are replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-start">Start date</Label>
              <Input
                id="plan-start"
                type="date"
                value={startDate}
                min={todayKey()}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-target">Target date</Label>
              <Input
                id="plan-target"
                type="date"
                value={targetDate}
                min={startDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Daily goal</Label>
              <p className="mt-1 text-xs text-muted-foreground">Problems per study day</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setDailyGoal((g) => Math.max(1, g - 1))}
                aria-label="Decrease"
              >
                <Minus />
              </Button>
              <span className="w-8 text-center text-lg font-semibold tabular-nums">
                {dailyGoal}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setDailyGoal((g) => Math.min(20, g + 1))}
                aria-label="Increase"
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Study days</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((label, d) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={studyDays.includes(d)}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'cursor-pointer rounded-lg border py-2 text-xs font-semibold transition',
                    studyDays.includes(d)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chapters</Label>
            <div className="grid max-h-40 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto rounded-lg border p-3 scrollbar-thin">
              {sheet?.chapters.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={!chapterIds || chapterIds.includes(c.id)}
                    onCheckedChange={() => toggleChapter(c.id)}
                  />
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'flex gap-3 rounded-lg border p-4 text-sm',
              preview.fits
                ? 'border-easy/30 bg-easy-soft/40'
                : 'border-medium/40 bg-medium-soft/40',
            )}
          >
            {preview.fits ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-easy" />
            ) : (
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-medium" />
            )}
            <div>
              <p className="font-semibold">
                {preview.remaining} unsolved problems · {pluralize(preview.days, 'study day')} ·
                capacity {preview.capacity}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {preview.fits
                  ? `You will finish ${preview.remaining ? `around ${prettyDate(targetDate)} or earlier` : '— nothing left to plan!'}.`
                  : `Not enough time at ${dailyGoal}/day. Increase to ${preview.needed}/day or move the target date.`}
              </p>
              {!preview.fits && (
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0"
                  onClick={() => setDailyGoal(Math.min(20, preview.needed))}
                >
                  Use {Math.min(20, preview.needed)} per day
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={generate.isPending || preview.remaining === 0}>
            <WandSparkles /> {generate.isPending ? 'Generating…' : 'Generate plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
