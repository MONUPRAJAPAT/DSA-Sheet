import { toast } from 'sonner';
import { celebrate, originOf } from '@/lib/celebrate';
import { toKey } from '@/lib/dates';
import { useAuth } from '@/stores/auth';
import { useCelebration } from '@/stores/celebration';
import { useProblemIndex, useProgress, useUpdateProgress } from './hooks';

const MILESTONES: Record<number, string> = {
  1: 'Your first problem — great start!',
  10: '10 problems solved. You’re building momentum.',
  25: '25 problems solved. Consistency is paying off.',
  50: '50 problems solved. Halfway to a hundred!',
  100: '100 problems solved. Seriously impressive.',
  150: '150 problems solved. Interview-ready territory.',
  200: 'You completed the entire sheet. Legendary.',
};

/**
 * Ticks / unticks a problem and gives the student the right amount of feedback:
 * an undo-able toast for every solve, confetti for first problem, topic completion,
 * daily goal and milestones, and a celebration dialog for finishing a chapter.
 */
export function useToggleSolved() {
  const update = useUpdateProgress();
  const { map } = useProgress();
  const { byId, list } = useProblemIndex();
  const dailyGoal = useAuth((s) => s.user?.preferences.dailyGoal ?? 3);
  const showChapter = useCelebration((s) => s.showChapter);

  return (problemId: string, solved: boolean, sourceEl?: Element | null) => {
    const ref = byId.get(problemId);
    const previous = map.get(problemId)?.status ?? 'todo';
    const undo = { label: 'Undo', onClick: () => update.mutate({ problemId, status: previous }) };

    update.mutate(
      { problemId, status: solved ? 'solved' : 'todo' },
      {
        onSuccess: () => {
          if (!ref) return;
          if (!solved) {
            toast('Marked as not solved', { description: ref.problem.title, action: undo });
            return;
          }

          // Work out what this solve completed, from the state *before* the click plus this problem.
          const solvedIds = new Set(
            [...map.values()].filter((p) => p.status === 'solved').map((p) => p.problemId),
          );
          solvedIds.add(problemId);
          const total = solvedIds.size;
          const chapterProblems = ref.chapter.topics.flatMap((t) => t.problems);
          const chapterDone = chapterProblems.every((p) => solvedIds.has(p.id));
          const topicDone = ref.topic.problems.every((p) => solvedIds.has(p.id));
          const today = toKey(new Date());
          const solvedToday =
            [...map.values()].filter(
              (p) =>
                p.status === 'solved' &&
                p.problemId !== problemId &&
                p.solvedAt &&
                toKey(new Date(p.solvedAt)) === today,
            ).length + 1;
          const origin = originOf(sourceEl);

          if (chapterDone) {
            celebrate('big');
            const chapters = [...new Map(list.map((r) => [r.chapter.id, r.chapter])).values()];
            const next = chapters[chapters.findIndex((c) => c.id === ref.chapter.id) + 1];
            showChapter({
              chapterTitle: ref.chapter.title,
              problems: chapterProblems.length,
              totalSolved: total,
              totalProblems: list.length,
              next: next ? { title: next.title, slug: next.slug } : null,
            });
            return;
          }
          if (MILESTONES[total]) {
            celebrate('medium', origin);
            toast.success(MILESTONES[total], {
              description: `${ref.problem.title} solved · ${total}/${list.length}`,
              action: undo,
            });
            return;
          }
          if (topicDone) {
            celebrate('small', origin);
            toast.success(`Topic complete: ${ref.topic.title}`, {
              description: `All ${ref.topic.problems.length} problems solved. Revisions are on your calendar.`,
              action: undo,
            });
            return;
          }
          if (solvedToday === dailyGoal) {
            celebrate('small', origin);
            toast.success('Daily goal reached 🎯', {
              description: `${solvedToday} problems solved today. See you tomorrow!`,
              action: undo,
            });
            return;
          }
          toast.success(`Solved: ${ref.problem.title}`, {
            description: 'First revision scheduled for tomorrow.',
            action: undo,
          });
        },
      },
    );
  };
}
