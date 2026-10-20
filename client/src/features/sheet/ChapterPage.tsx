import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { usePageTitle } from '@/lib/usePageTitle';
import { Check, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { cn, percent } from '@/lib/utils';
import { FilterBar } from './FilterBar';
import { defaultFilters, matches, type Filters } from './filters';
import { useProgress, useSheet } from './hooks';
import { chapterIcon } from './icons';
import { TopicSection } from './TopicSection';

export function ChapterPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const highlightId = params.get('problem');
  const sheet = useSheet();
  const { map } = useProgress();
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const chapters = sheet.data?.chapters ?? [];
  const idx = chapters.findIndex((c) => c.slug === slug);
  const chapter = chapters[idx];
  usePageTitle(chapter?.title ?? 'DSA Sheet');

  // "Resume where you left off": scroll to and highlight the requested problem.
  useEffect(() => {
    if (!highlightId || !chapter) return;
    setFilters(defaultFilters);
    const t = setTimeout(
      () =>
        document
          .getElementById(`problem-${highlightId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      150,
    );
    const clear = setTimeout(() => setParams({}, { replace: true }), 3500);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [highlightId, chapter, setParams]);

  const startIndexes = useMemo(() => {
    let n = 0;
    return (chapter?.topics ?? []).map((t) => {
      const s = n;
      n += t.problems.length;
      return s;
    });
  }, [chapter]);

  if (sheet.isError)
    return <ErrorState message={sheet.error.message} onRetry={() => sheet.refetch()} />;
  if (sheet.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-10 rounded-lg" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  if (!chapter) return <Navigate to="/sheet" replace />;

  const Icon = chapterIcon(chapter.icon);
  const problems = chapter.topics.flatMap((t) => t.problems);
  const solved = problems.filter((p) => map.get(p.id)?.status === 'solved').length;
  const anyVisible = problems.some((p) => matches(p, map.get(p.id), filters));
  const prev = chapters[idx - 1];
  const next = chapters[idx + 1];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_1fr]">
      {/* Chapter rail for fast navigation across the hierarchy */}
      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-0.5">
          <Link
            to="/sheet"
            className="mb-3 flex items-center gap-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" /> All chapters
          </Link>
          {chapters.map((c) => {
            const ps = c.topics.flatMap((t) => t.problems);
            const s = ps.filter((p) => map.get(p.id)?.status === 'solved').length;
            return (
              <Link
                key={c.id}
                to={`/sheet/${c.slug}`}
                className={cn(
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground',
                  c.id === chapter.id &&
                    'bg-card font-medium text-foreground shadow-xs ring-1 ring-border',
                )}
              >
                <span className="truncate">{c.title}</span>
                <span className={cn('text-[11px] tabular-nums', s === ps.length && 'text-easy')}>
                  {percent(s, ps.length)}%
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <nav
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link to="/sheet" className="hover:text-foreground">
            DSA Sheet
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{chapter.title}</span>
        </nav>

        <Card className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
              Chapter {chapter.order}
              {solved === problems.length && (
                <span className="inline-flex items-center gap-1 rounded-full bg-easy-soft px-2 py-0.5 text-[10px] tracking-normal text-easy normal-case">
                  <Check className="size-3" strokeWidth={3} /> Completed
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{chapter.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{chapter.description}</p>
          </div>
          <ProgressRing
            value={percent(solved, problems.length)}
            size={76}
            stroke={7}
            className="absolute top-5 right-5 sm:static"
          >
            <span className="text-lg font-semibold tabular-nums">
              {percent(solved, problems.length)}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              {solved}/{problems.length}
            </span>
          </ProgressRing>
        </Card>

        <FilterBar filters={filters} onChange={setFilters} />

        <div className="space-y-4">
          {chapter.topics.map((topic, i) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              number={i + 1}
              progress={map}
              filters={filters}
              highlightId={highlightId}
              startIndex={startIndexes[i]!}
            />
          ))}
          {!anyVisible && (
            <EmptyState
              icon={SearchX}
              title="No problems match these filters"
              description="Try a different difficulty or status."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(defaultFilters)}>
                  Clear filters
                </Button>
              }
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {prev ? (
            <Button variant="outline" asChild>
              <Link to={`/sheet/${prev.slug}`}>
                <ChevronLeft /> {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button variant="outline" asChild>
              <Link to={`/sheet/${next.slug}`}>
                {next.title} <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
