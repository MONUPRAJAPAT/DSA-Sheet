import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CalendarEventDTO,
  CreateEventInput,
  GeneratePlanInput,
  PlanSummaryDTO,
  UpdateEventInput,
} from '@dsa/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';

export const useEvents = (from: string, to: string) =>
  useQuery({
    queryKey: qk.events(from, to),
    queryFn: () => api<CalendarEventDTO[]>(`/calendar/events?from=${from}&to=${to}`),
    placeholderData: (prev) => prev,
  });

export interface StudyPlan {
  startDate: string;
  targetDate: string;
  dailyGoal: number;
  studyDays: number[];
  problemsScheduled: number;
}

export const usePlan = () =>
  useQuery({
    queryKey: qk.plan,
    queryFn: () => api<StudyPlan>('/calendar/plan').catch(() => null),
  });

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.calendar });
    qc.invalidateQueries({ queryKey: qk.progress });
  };
}

const onError = (err: Error) => toast.error(err.message);

export function useCreateEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Partial<CreateEventInput> & { date: string }) =>
      api<CalendarEventDTO>('/calendar/events', { method: 'POST', body: input }),
    onSuccess: invalidate,
    onError,
  });
}

export function useUpdateEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEventInput & { id: string }) =>
      api<CalendarEventDTO>(`/calendar/events/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
    onError,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/calendar/events/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
    onError,
  });
}

export function useRollover() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<{ moved: number }>('/calendar/rollover', { method: 'POST' }),
    onSuccess: (r) => {
      invalidate();
      toast.success(`Moved ${r.moved} overdue task${r.moved === 1 ? '' : 's'} to today`);
    },
    onError,
  });
}

export function useGeneratePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Partial<GeneratePlanInput> & Omit<GeneratePlanInput, 'replaceExisting'>) =>
      api<PlanSummaryDTO>('/calendar/plan', { method: 'POST', body: input }),
    onSuccess: invalidate,
    onError,
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api('/calendar/plan', { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast.success('Study plan removed');
    },
    onError,
  });
}

export async function downloadIcs() {
  const blob = await api<Blob>('/calendar/export.ics', { raw: true });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: 'dsa-study-plan.ics',
  });
  a.click();
  URL.revokeObjectURL(url);
}
