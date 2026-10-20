import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  ChapterDTO,
  ProblemDTO,
  ProgressDTO,
  SheetDTO,
  TopicDTO,
  UpdateProgressInput,
} from '@dsa/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuth } from '@/stores/auth';

export function useSheet() {
  return useQuery({
    queryKey: qk.sheet,
    queryFn: () => api<SheetDTO>('/sheet'),
    staleTime: 10 * 60_000,
  });
}

export interface ProblemRef {
  problem: ProblemDTO;
  topic: TopicDTO;
  chapter: ChapterDTO;
  index: number;
}

/** Flat, ordered index of every problem with its parents — used for search, resume and planning. */
export function useProblemIndex() {
  const { data } = useSheet();
  return useMemo(() => {
    const list: ProblemRef[] = [];
    const byId = new Map<string, ProblemRef>();
    data?.chapters.forEach((chapter) =>
      chapter.topics.forEach((topic) =>
        topic.problems.forEach((problem) => {
          const ref = { problem, topic, chapter, index: list.length };
          list.push(ref);
          byId.set(problem.id, ref);
        }),
      ),
    );
    return { list, byId };
  }, [data]);
}

export function useProgress() {
  const authed = useAuth((s) => s.status === 'authenticated');
  const query = useQuery({
    queryKey: qk.progress,
    queryFn: () => api<ProgressDTO[]>('/progress'),
    enabled: authed,
  });
  const map = useMemo(() => new Map((query.data ?? []).map((p) => [p.problemId, p])), [query.data]);
  return { ...query, map };
}

/**
 * Optimistic progress update: the checkbox flips instantly, the request is sent in the
 * background, and the change is rolled back (with a toast) if the server rejects it.
 */
export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ problemId, ...input }: UpdateProgressInput & { problemId: string }) =>
      api<ProgressDTO>(`/progress/${problemId}`, { method: 'PUT', body: input }),
    onMutate: async ({ problemId, ...input }) => {
      await qc.cancelQueries({ queryKey: qk.progress, exact: true });
      const previous = qc.getQueryData<ProgressDTO[]>(qk.progress);
      qc.setQueryData<ProgressDTO[]>(qk.progress, (rows = []) => {
        const existing = rows.find((r) => r.problemId === problemId);
        const base: ProgressDTO = existing ?? {
          problemId,
          status: 'todo',
          starred: false,
          notes: '',
          solvedAt: null,
          updatedAt: new Date().toISOString(),
        };
        const next = { ...base, ...input };
        if (input.status === 'solved' && base.status !== 'solved')
          next.solvedAt = new Date().toISOString();
        if (input.status && input.status !== 'solved') next.solvedAt = null;
        return existing ? rows.map((r) => (r.problemId === problemId ? next : r)) : [...rows, next];
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.progress, ctx.previous);
      toast.error('Could not save progress', { description: (err as Error).message });
    },
    onSuccess: (row) => {
      qc.setQueryData<ProgressDTO[]>(qk.progress, (rows = []) =>
        rows.map((r) => (r.problemId === row.problemId ? row : r)),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.stats });
      qc.invalidateQueries({ queryKey: qk.heatmap });
      qc.invalidateQueries({ queryKey: qk.calendar });
    },
  });
}

/** Remembers the last problem the student opened so they can resume exactly there. */
export function useTrackLastActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (problemId: string) =>
      api('/progress/last-active', { method: 'POST', body: { problemId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.stats }),
  });
}

/** Number of problems the student solved today (their local day). */
export function useSolvedToday() {
  const { map } = useProgress();
  return useMemo(() => {
    const today = new Date().toDateString();
    return [...map.values()].filter(
      (p) => p.status === 'solved' && p.solvedAt && new Date(p.solvedAt).toDateString() === today,
    ).length;
  }, [map]);
}
