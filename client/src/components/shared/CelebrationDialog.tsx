import { Link } from 'react-router';
import { ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useCelebration } from '@/stores/celebration';
import { percent } from '@/lib/utils';

/** Shown when a student finishes every problem in a chapter. */
export function CelebrationDialog() {
  const { chapter, close } = useCelebration();
  return (
    <Dialog open={!!chapter} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md overflow-hidden p-0 text-center">
        {chapter && (
          <>
            <div className="relative bg-gradient-to-b from-primary/15 via-primary/5 to-transparent px-6 pt-10 pb-2">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-orange-500/30 animate-in zoom-in-50 duration-500">
                <Trophy className="size-8" />
              </div>
              <DialogTitle className="mt-6 text-2xl font-semibold tracking-tight">
                Chapter complete!
              </DialogTitle>
              <DialogDescription className="mt-2 text-[15px]">
                You solved all {chapter.problems} problems in{' '}
                <span className="font-semibold text-foreground">{chapter.chapterTitle}</span>.
                That’s real progress.
              </DialogDescription>
            </div>
            <div className="px-6 pb-6">
              <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="font-semibold tabular-nums">
                    {chapter.totalSolved}/{chapter.totalProblems} ·{' '}
                    {percent(chapter.totalSolved, chapter.totalProblems)}%
                  </span>
                </div>
                <Progress
                  value={percent(chapter.totalSolved, chapter.totalProblems)}
                  className="mt-2.5 h-2"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Revisions for these problems are already on your calendar.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                <Button variant="outline" onClick={close}>
                  Keep reviewing
                </Button>
                {chapter.next && (
                  <Button asChild onClick={close}>
                    <Link to={`/sheet/${chapter.next.slug}`}>
                      Start {chapter.next.title} <ArrowRight />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
