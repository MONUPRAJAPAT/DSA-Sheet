import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '@/lib/usePageTitle';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, {
  type DateClickArg,
  type DropArg,
  type EventResizeDoneArg,
} from '@fullcalendar/interaction';
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Download,
  History,
  Plus,
  Target,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { EVENT_TYPES, type CalendarEventDTO } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/shared/States';
import { useAgenda } from '@/features/dashboard/hooks';
import { addDaysKey, prettyDate, toKey, todayKey } from '@/lib/dates';
import { cn, percent, pluralize } from '@/lib/utils';
import { BacklogPanel } from './BacklogPanel';
import { EventDialog, type EventDialogState } from './EventDialog';
import { EVENT_META } from './eventMeta';
import {
  downloadIcs,
  useCreateEvent,
  useDeletePlan,
  useEvents,
  usePlan,
  useRollover,
  useUpdateEvent,
} from './hooks';
import { PlanWizardDialog } from './PlanWizardDialog';

type View = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

const toEventInput = (e: CalendarEventDTO): EventInput => ({
  id: e.id,
  title: e.title,
  start: e.startTime ? `${e.date}T${e.startTime}` : e.date,
  end: e.startTime && e.endTime && e.endTime > e.startTime ? `${e.date}T${e.endTime}` : undefined,
  allDay: !e.startTime,
  editable: e.status !== 'missed',
  extendedProps: { dto: e },
});

function EventChip({ event, view }: EventContentArg) {
  const e = event.extendedProps.dto as CalendarEventDTO;
  const meta = EVENT_META[e.type];
  const done = e.status === 'done';
  const missed = e.status === 'missed';
  if (view.type.startsWith('list'))
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        {done ? (
          <CircleCheck className="size-4 shrink-0 text-easy" />
        ) : (
          <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate font-medium',
              (done || missed) && 'text-muted-foreground line-through',
            )}
          >
            {e.title}
          </span>
          <span className="block text-xs text-muted-foreground">
            {meta.label}
            {e.startTime
              ? ` · ${e.startTime}${e.endTime && e.endTime !== e.startTime ? `–${e.endTime}` : ''}`
              : ' · All day'}
            {e.problem && ` · ${e.problem.difficulty}`}
            {e.overdue && <span className="font-medium text-hard"> · overdue</span>}
            {missed && ' · missed'}
          </span>
        </span>
      </span>
    );
  return (
    <div
      className={cn(
        'flex w-full items-center gap-1.5 overflow-hidden rounded-[5px] border-l-[3px] px-1.5 py-[3px] text-[11.5px] leading-tight font-medium',
        meta.chip,
        done && 'opacity-55',
        missed &&
          'border-l-muted-foreground/40 bg-muted text-muted-foreground line-through opacity-70',
        e.overdue && 'ring-1 ring-hard/50',
      )}
      title={`${meta.label}: ${e.title}`}
    >
      {done && <CircleCheck className="size-3 shrink-0" />}
      {e.startTime && <span className="shrink-0 tabular-nums opacity-80">{e.startTime}</span>}
      <span className={cn('truncate', done && 'line-through')}>
        {e.type === 'revision' ? e.title.replace(/^Revise:\s*/, '') : e.title}
      </span>
    </div>
  );
}

/**
 * Standalone study calendar (PDF §7): plan (manual entries, drag-and-drop backlog, auto plan),
 * track (done / missed / overdue states, weekly completion) and revisit (spaced-repetition revisions).
 */
export function CalendarPage() {
  usePageTitle('Study Calendar');
  const calendarRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState({
    from: addDaysKey(todayKey(), -42),
    to: addDaysKey(todayKey(), 42),
  });
  const [title, setTitle] = useState('');
  const [view, setView] = useState<View>(() =>
    window.innerWidth < 640 ? 'listWeek' : 'dayGridMonth',
  );
  const [dialog, setDialog] = useState<EventDialogState>(null);
  const [params, setParams] = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(() => params.get('plan') === '1');
  // `?plan=1` (from onboarding / empty states) opens the plan wizard once, then cleans the URL.
  useEffect(() => {
    if (params.get('plan') === '1') setParams({}, { replace: true });
  }, [params, setParams]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const events = useEvents(range.from, range.to);
  const agenda = useAgenda();
  const plan = usePlan();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const rollover = useRollover();
  const deletePlan = useDeletePlan();

  const data = useMemo(() => events.data ?? [], [events.data]);
  const inputs = useMemo(
    () => data.filter((e) => !hidden.has(e.type)).map(toEventInput),
    [data, hidden],
  );
  const scheduledIds = useMemo(
    () =>
      new Set(data.filter((e) => e.problem && e.status === 'pending').map((e) => e.problem!.id)),
    [data],
  );

  // This week's completion (Mon–Sun containing today).
  const week = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const from = toKey(monday);
    const to = addDaysKey(from, 6);
    const inWeek = data.filter((e) => e.date >= from && e.date <= to && e.status !== 'missed');
    return { total: inWeek.length, done: inWeek.filter((e) => e.status === 'done').length };
  }, [data]);

  const api = () => calendarRef.current?.getApi();
  const changeView = (v: View) => {
    setView(v);
    api()?.changeView(v);
  };

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    setTitle(arg.view.title);
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    setRange({ from: toKey(arg.start), to: toKey(end) });
  }, []);

  const onDateClick = (arg: DateClickArg) => {
    const date = toKey(arg.date);
    const time = arg.allDay ? undefined : arg.date.toTimeString().slice(0, 5);
    setDialog({ mode: 'create', date, startTime: time, endTime: time ? addHour(time) : undefined });
  };

  const onEventClick = (arg: EventClickArg) =>
    setDialog({ mode: 'edit', event: arg.event.extendedProps.dto as CalendarEventDTO });

  // Drag an existing event to another day / time slot → reschedule.
  const onEventDrop = (arg: EventDropArg) => {
    const e = arg.event;
    if (!e.start) return arg.revert();
    update.mutate(
      {
        id: e.id,
        date: toKey(e.start),
        startTime: e.allDay ? null : e.start.toTimeString().slice(0, 5),
        endTime: e.allDay ? null : (e.end ?? e.start).toTimeString().slice(0, 5),
      },
      {
        onSuccess: () =>
          toast.success(`Moved to ${prettyDate(toKey(e.start!))}`, { description: e.title }),
        onError: () => arg.revert(),
      },
    );
  };

  const onEventResize = (arg: EventResizeDoneArg) => {
    const e = arg.event;
    if (!e.end) return arg.revert();
    update.mutate(
      { id: e.id, endTime: e.end.toTimeString().slice(0, 5) },
      { onError: () => arg.revert() },
    );
  };

  // Drop a backlog problem onto the calendar → new study task.
  const onDrop = (arg: DropArg) => {
    const problemId = arg.draggedEl.dataset.problemId;
    if (!problemId) return;
    const time = arg.allDay
      ? {}
      : {
          startTime: arg.date.toTimeString().slice(0, 5),
          endTime: addHour(arg.date.toTimeString().slice(0, 5)),
        };
    create.mutate(
      { problemId, date: toKey(arg.date), type: 'study', ...time },
      {
        onSuccess: (ev) =>
          toast.success(`Scheduled for ${prettyDate(ev.date)}`, { description: ev.title }),
      },
    );
  };

  const overdue = agenda.data?.overdue ?? [];

  return (
    <>
      <PageHeader
        title="Study Calendar"
        description="Plan your preparation, track every session and revisit problems at the right time."
        actions={
          <>
            <Button
              variant="outline"
              aria-label="Export calendar as .ics"
              onClick={() =>
                downloadIcs()
                  .then(() =>
                    toast.success('Calendar exported', {
                      description: 'Import the .ics file into Google, Apple or Outlook Calendar.',
                    }),
                  )
                  .catch(() => toast.error('Export failed — please try again'))
              }
            >
              <Download />
              <span className="hidden sm:inline">Export .ics</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialog({ mode: 'create', date: todayKey() })}
            >
              <Plus /> New entry
            </Button>
            <Button onClick={() => setWizardOpen(true)}>
              <WandSparkles /> {plan.data ? 'Regenerate plan' : 'Generate study plan'}
            </Button>
          </>
        }
      />

      {!plan.isPending && !plan.data && !events.isPending && data.length === 0 && (
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.07] to-transparent p-5 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WandSparkles className="size-5" />
          </span>
          <div className="flex-1 text-sm">
            <p className="font-semibold">Plan your preparation in seconds</p>
            <p className="text-muted-foreground">
              Choose a target date and daily goal — we’ll schedule every unsolved problem, with
              revisions built in. Or drag problems from the backlog.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="shrink-0">
            Create my plan <ArrowRight />
          </Button>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-hard/30 bg-hard-soft/40 p-4 sm:flex-row sm:items-center">
          <History className="size-5 shrink-0 text-hard" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {pluralize(overdue.length, 'task')} slipped past their day
            </p>
            <p className="text-muted-foreground">
              Roll them over to today — the originals stay in your history as missed.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rollover.mutate()}
            disabled={rollover.isPending}
          >
            Move to today
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="min-w-0 p-3 sm:p-4">
          {/* Custom toolbar in the design system's style */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => api()?.prev()}
                aria-label="Previous"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => api()?.next()}
                aria-label="Next"
              >
                <ChevronRight />
              </Button>
              <Button variant="outline" size="sm" onClick={() => api()?.today()}>
                Today
              </Button>
              <h2 className="ml-2 text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            <Tabs value={view} onValueChange={(v) => changeView(v as View)}>
              <TabsList>
                <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
                <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
                <TabsTrigger value="listWeek">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(t)) n.delete(t);
                    else n.add(t);
                    return n;
                  })
                }
                aria-pressed={!hidden.has(t)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                  hidden.has(t) ? 'text-muted-foreground opacity-50' : 'bg-card',
                )}
              >
                <span className={cn('size-2 rounded-full', EVENT_META[t].dot)} />
                {EVENT_META[t].label}
              </button>
            ))}
            {events.isFetching && (
              <span className="ml-auto text-xs text-muted-foreground">Syncing…</span>
            )}
          </div>

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            height="auto"
            firstDay={1}
            dayMaxEvents={4}
            nowIndicator
            editable
            droppable
            eventStartEditable
            eventDurationEditable
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            scrollTime="17:00:00"
            allDayText="All day"
            events={inputs}
            eventContent={EventChip}
            datesSet={onDatesSet}
            dateClick={onDateClick}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
            drop={onDrop}
            noEventsContent="No study tasks in this period — drag a problem here or generate a plan."
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" /> This week
              </CardTitle>
              <CardDescription>
                {week.total
                  ? `${week.done} of ${pluralize(week.total, 'task')} done`
                  : 'No tasks planned this week'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={percent(week.done, week.total)} barClassName="bg-easy" />
              {plan.data ? (
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  <p className="font-semibold text-foreground">Active plan</p>
                  <p className="mt-1 text-muted-foreground">
                    {plan.data.dailyGoal}/day until {prettyDate(plan.data.targetDate)} ·{' '}
                    {pluralize(plan.data.problemsScheduled, 'problem')} scheduled
                  </p>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1 font-medium text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" /> Remove plan
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tip: generate a plan and we’ll schedule every unsolved problem before your target
                  date.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Backlog</CardTitle>
              <CardDescription>Drag a problem onto any day or time slot</CardDescription>
            </CardHeader>
            <CardContent>
              <BacklogPanel scheduledIds={scheduledIds} />
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog state={dialog} onClose={() => setDialog(null)} />
      {wizardOpen && <PlanWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove study plan?"
        description="All pending auto-planned tasks will be removed. Completed tasks, revisions and your own entries are kept."
        confirmLabel="Remove plan"
        destructive
        onConfirm={() => deletePlan.mutate()}
      />
    </>
  );
}

function addHour(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${String(Math.min(23, h! + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
