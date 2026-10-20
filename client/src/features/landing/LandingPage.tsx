import { Link } from 'react-router';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChartNoAxesColumn,
  CircleCheck,
  Flame,
  Layers,
  Plus,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/shared/Logo';
import {
  ArticleIcon,
  CodeforcesIcon,
  LeetCodeIcon,
  YouTubeIcon,
} from '@/components/shared/PlatformIcon';
import { DemoButton } from '@/features/auth/DemoButton';
import { useSheet } from '@/features/sheet/hooks';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { LandingNav, SECTIONS } from './LandingNav';
import { ProductShot } from './ProductShot';

/* ------------------------------------------------------------------ small building blocks */

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground text-balance">{text}</p>
    </div>
  );
}

function BentoCard({
  icon: Icon,
  title,
  text,
  visual,
  className,
}: {
  icon: typeof Layers;
  title: string;
  text: string;
  visual: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group flex flex-col rounded-2xl border bg-card p-2 shadow-xs transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="relative h-52 overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-5">
        {visual}
      </div>
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h3 className="font-semibold tracking-tight">{title}</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

const bar = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' } as const;

/* ------------------------------------------------------------------ feature visuals (illustrative UI) */

function CurriculumVisual() {
  const rows = [
    { t: 'Arrays', v: 100 },
    { t: 'Two Pointers & Sliding Window', v: 62 },
    { t: 'Dynamic Programming', v: 18 },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {rows.map((r) => (
        <div key={r.t} className="rounded-lg border bg-card px-3.5 py-2.5 shadow-xs">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">{r.t}</span>
            <span className={cn('tabular-nums text-muted-foreground', r.v === 100 && 'text-easy')}>
              {r.v}%
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', r.v === 100 ? 'bg-easy' : 'bg-primary')}
              style={{ width: `${r.v}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourcesVisual() {
  const items = [
    { icon: <YouTubeIcon />, t: 'Video explanation' },
    { icon: <LeetCodeIcon />, t: 'Practice on LeetCode' },
    { icon: <ArticleIcon />, t: 'Theory article' },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {items.map((i) => (
        <div
          key={i.t}
          className="flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-[13px] font-medium shadow-xs"
        >
          {i.icon}
          {i.t}
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
}

function ProgressVisual() {
  const rows = [
    { t: 'Two Sum', d: 'Easy' as const, done: true },
    { t: 'Group Anagrams', d: 'Medium' as const, done: true },
    { t: 'Longest Consecutive Sequence', d: 'Medium' as const, done: false },
  ];
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="divide-y rounded-lg border bg-card shadow-xs">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-[4px] border-[1.5px]',
                r.done ? 'border-easy bg-easy text-white' : 'border-input',
              )}
            >
              {r.done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={cn('flex-1 truncate font-medium', r.done && 'text-muted-foreground')}>
              {r.t}
            </span>
            <span className={cn('size-1.5 rounded-full', bar[r.d])} />
          </div>
        ))}
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-easy-soft px-2.5 py-1 text-[11px] font-semibold text-easy">
        <CircleCheck className="size-3" /> Saved to your account
      </span>
    </div>
  );
}

function CalendarVisual() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chips: Record<number, { t: string; c: string }[]> = {
    0: [
      { t: 'Two Sum', c: 'study' },
      { t: 'Valid Anagram', c: 'study' },
    ],
    1: [{ t: 'Revise: Rotate Array', c: 'revision' }],
    2: [
      { t: '3Sum', c: 'study' },
      { t: 'Revise: Two Sum', c: 'revision' },
    ],
    3: [{ t: 'Container With Most…', c: 'study' }],
    4: [
      { t: 'Trapping Rain Water', c: 'study' },
      { t: 'Revise: 3Sum', c: 'revision' },
    ],
    5: [{ t: 'Weekly mock contest', c: 'contest' }],
    6: [],
  };
  const tone: Record<string, string> = {
    study: 'border-l-study bg-study/10 text-study',
    revision: 'border-l-revision bg-revision/10 text-revision',
    contest: 'border-l-contest bg-contest/10 text-contest',
  };
  return (
    <div className="grid h-full grid-cols-7 gap-1.5">
      {days.map((d, i) => (
        <div
          key={d}
          className={cn(
            'rounded-lg border bg-card p-1.5 shadow-xs',
            i === 2 && 'ring-1 ring-primary/40',
          )}
        >
          <p
            className={cn(
              'mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase',
              i === 2 && 'text-primary',
            )}
          >
            {d}
          </p>
          <div className="space-y-1">
            {chips[i]!.map((c) => (
              <div
                key={c.t}
                className={cn(
                  'truncate rounded-[4px] border-l-2 px-1 py-0.5 text-[9.5px] font-medium',
                  tone[c.c],
                )}
              >
                {c.t}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RevisionVisual() {
  const steps = ['+1 day', '+3 days', '+7 days', '+21 days'];
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="relative flex items-center justify-between px-1">
        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span className="relative flex size-8 items-center justify-center rounded-full bg-easy text-white shadow-sm">
          <Check className="size-4" strokeWidth={3} />
        </span>
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              'relative size-3.5 rounded-full border-2 border-revision bg-card',
              i === 0 && 'bg-revision',
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10.5px] font-medium text-muted-foreground">
        <span className="text-easy">Solved</span>
        {steps.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function InsightsVisual() {
  // A deterministic pattern so the illustration is stable between renders.
  const levels = Array.from({ length: 7 * 20 }, (_, i) =>
    (i * 37) % 11 > 6 ? ((i * 13) % 4) + 1 : i > 110 ? (i % 3) + 2 : 0,
  );
  const tones = ['bg-muted', 'bg-primary/25', 'bg-primary/45', 'bg-primary/70', 'bg-primary'];
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex gap-3">
        <div className="rounded-lg border bg-card px-3 py-2 shadow-xs">
          <p className="text-[10px] font-medium text-muted-foreground">Solved</p>
          <p className="text-lg font-semibold tabular-nums">
            84<span className="text-xs text-muted-foreground">/200</span>
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 shadow-xs">
          <p className="text-[10px] font-medium text-muted-foreground">Streak</p>
          <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
            12d <Flame className="size-3.5 text-orange-500" />
          </p>
        </div>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px] self-start">
        {levels.map((l, i) => (
          <span key={i} className={cn('size-[9px] rounded-[2px]', tones[l])} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const faqs = [
  {
    q: 'Is DSA Sheet free?',
    a: 'Yes. Create an account and every chapter, resource, the study calendar and progress tracking are available at no cost.',
  },
  {
    q: 'Where do the problems and resources come from?',
    a: 'Problems link to LeetCode and Codeforces with their official titles and difficulty. Each topic and problem also has a video explanation and a theory article, and every link is checked automatically every week.',
  },
  {
    q: 'How is my progress saved?',
    a: 'Each tick is saved to your account the moment you click it. Log in on any device and you continue exactly where you left off — including stars, notes and your study plan.',
  },
  {
    q: 'Can I plan around an exam or placement date?',
    a: 'Yes. Pick a target date, a daily goal and your study days, and the planner spreads your remaining problems across the calendar — and tells you if the plan doesn’t fit.',
  },
  {
    q: 'How does revision work?',
    a: 'When you solve a problem, revisions are scheduled automatically after 1, 3, 7 and 21 days — the spacing that moves patterns into long-term memory.',
  },
  { q: 'Does it work on mobile?', a: 'Yes. Every page is responsive, with light and dark themes.' },
];

export function LandingPage() {
  usePageTitle();
  const authed = useAuth((s) => s.status === 'authenticated');
  const { data, isPending } = useSheet();
  const topics = data?.chapters.reduce((n, c) => n + c.topics.length, 0);
  const stats = data
    ? [
        { value: data.chapters.length, label: 'Chapters' },
        { value: topics!, label: 'Topics' },
        { value: data.totals.problems, label: 'Curated problems' },
        { value: (data.totals.problems + topics!) * 3, label: 'Learning resources' },
      ]
    : null;
  const primaryCta = authed
    ? { to: '/dashboard', label: 'Continue learning' }
    : { to: '/register', label: 'Get started — it’s free' };

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background">
      {/* Page-level backdrop so the navbar and hero share one continuous surface */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[880px]">
        <div className="absolute inset-0 bg-[radial-gradient(56rem_34rem_at_50%_-8rem,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(52rem_30rem_at_50%_0,black,transparent_75%)] [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <LandingNav />

      <main className="relative">
        {/* ---------------- hero */}
        <section className="mx-auto max-w-6xl px-5 pt-32 pb-20 text-center sm:px-6 sm:pt-40">
          <a
            href="#curriculum"
            className="inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3 pl-1 text-[13px] text-muted-foreground shadow-xs backdrop-blur transition hover:text-foreground"
          >
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Free
            </span>
            200 problems across 12 chapters
            <ArrowRight className="size-3.5" />
          </a>
          <h1 className="mx-auto mt-7 max-w-4xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl md:text-7xl">
            Master DSA with a plan,{' '}
            <span className="bg-gradient-to-br from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-indigo-400 dark:to-violet-400">
              not a guess.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
            A structured sheet of hand-picked problems with videos, practice links and articles —
            plus a study calendar that plans your weeks and schedules your revisions.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="h-12 w-full px-6 text-[15px] shadow-lg shadow-primary/25 sm:w-auto"
            >
              <Link to={primaryCta.to}>
                {primaryCta.label} <ArrowRight />
              </Link>
            </Button>
            {!authed && (
              <DemoButton
                size="lg"
                label="Try the live demo"
                className="h-12 w-full px-6 text-[15px] sm:w-auto"
              />
            )}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <LeetCodeIcon /> LeetCode
            </span>
            <span className="flex items-center gap-2">
              <CodeforcesIcon /> Codeforces
            </span>
            <span className="flex items-center gap-2">
              <YouTubeIcon /> Video explanations
            </span>
            <span className="flex items-center gap-2">
              <ArticleIcon /> Theory articles
            </span>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <div
              aria-hidden
              className="absolute -inset-x-10 -top-10 -bottom-4 rounded-[2rem] bg-gradient-to-b from-primary/15 to-transparent blur-3xl"
            />
            <ProductShot
              name="dashboard"
              alt="DSA Sheet dashboard showing progress, streak, today’s agenda and difficulty breakdown"
              className="relative"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
            />
          </div>
        </section>

        {/* ---------------- stats */}
        <section className="mx-auto max-w-5xl px-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-xs sm:grid-cols-4">
            {(stats ?? Array.from({ length: 4 }, () => null)).map((s, i) => (
              <div key={s?.label ?? i} className="bg-card px-6 py-6 text-center">
                {s ? (
                  <>
                    <dd className="text-3xl font-semibold tracking-tight tabular-nums">
                      {s.value}
                    </dd>
                    <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
                  </>
                ) : (
                  <Skeleton className="mx-auto h-14 w-24" />
                )}
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------- features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-28 sm:px-6">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to stay consistent"
            text="Designed around how students actually prepare: learn the concept, practise with intent, plan the week and revise before it fades."
          />
          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <BentoCard
              className="lg:col-span-2"
              icon={Layers}
              title="A structured curriculum"
              text="Chapters, topics and problems ordered from easy to hard — so you always know what to solve next."
              visual={<CurriculumVisual />}
            />
            <BentoCard
              icon={BookOpen}
              title="Every resource in one place"
              text="A video, a practice link and a theory article for every topic and every problem."
              visual={<ResourcesVisual />}
            />
            <BentoCard
              icon={CircleCheck}
              title="Progress that persists"
              text="Tick a problem and it’s saved instantly. Resume exactly where you left off, on any device."
              visual={<ProgressVisual />}
            />
            <BentoCard
              className="lg:col-span-2"
              icon={CalendarDays}
              title="A study calendar that plans for you"
              text="Generate a plan that fits your target date, drag problems onto days and roll missed tasks forward."
              visual={<CalendarVisual />}
            />
            <BentoCard
              icon={Repeat}
              title="Spaced-repetition revisions"
              text="Solved problems come back at 1, 3, 7 and 21 days — automatically."
              visual={<RevisionVisual />}
            />
            <BentoCard
              className="lg:col-span-2"
              icon={ChartNoAxesColumn}
              title="Insights that keep you going"
              text="Streaks, an activity heatmap, your difficulty split and chapter progress at a glance."
              visual={<InsightsVisual />}
            />
          </div>
        </section>

        {/* ---------------- how it works */}
        <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-5 py-28 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From first problem to interview-ready"
              text="Three habits, one place. The sheet tells you what to learn, the calendar tells you when."
            />
            <div className="mt-16 grid gap-10 lg:grid-cols-3">
              {[
                {
                  n: '01',
                  t: 'Learn the concept',
                  d: 'Open a topic, watch the explanation and read the theory before attempting its problems.',
                },
                {
                  n: '02',
                  t: 'Practise and track',
                  d: 'Solve on LeetCode or Codeforces, tick it off, add a note. Your progress updates everywhere instantly.',
                },
                {
                  n: '03',
                  t: 'Plan and revise',
                  d: 'Let the planner schedule the rest of the sheet before your target date, with revisions built in.',
                },
              ].map((s) => (
                <div key={s.n} className="relative">
                  <span className="font-mono text-sm font-medium text-primary">{s.n}</span>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-primary/60 via-border to-transparent" />
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.t}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-16 grid gap-4 lg:grid-cols-2">
              <ProductShot
                name="sheet"
                alt="A chapter of the DSA sheet with topics, problems, difficulty and resources"
              />
              <ProductShot
                name="calendar"
                alt="The study calendar with planned study tasks and revisions"
              />
            </div>
          </div>
        </section>

        {/* ---------------- curriculum */}
        <section id="curriculum" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-28 sm:px-6">
          <SectionHeading
            eyebrow="Curriculum"
            title="Twelve chapters. One clear path."
            text="From array fundamentals to dynamic programming — every chapter is broken into focused topics with problems of rising difficulty."
          />
          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isPending &&
              Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-[92px] rounded-xl" />
              ))}
            {data?.chapters.map((c) => {
              const ps = c.topics.flatMap((t) => t.problems);
              const n = { Easy: 0, Medium: 0, Hard: 0 };
              ps.forEach((p) => n[p.difficulty]++);
              return (
                <div key={c.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(c.order).padStart(2, '0')}
                    </span>
                    <h3 className="min-w-0 truncate font-semibold tracking-tight">{c.title}</h3>
                    <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {ps.length} problems
                    </span>
                  </div>
                  <p className="mt-1.5 pl-7 text-[13px] text-muted-foreground">
                    {c.topics.map((t) => t.title).join(' · ')}
                  </p>
                  <div className="mt-3 ml-7 flex h-1 overflow-hidden rounded-full bg-muted">
                    {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
                      <span
                        key={d}
                        className={bar[d]}
                        style={{ width: `${(n[d] / ps.length) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', bar[d])} /> {d}
              </span>
            ))}
          </p>
        </section>

        {/* ---------------- faq */}
        <section id="faq" className="scroll-mt-20 border-t">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-28 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="text-sm font-semibold text-primary">FAQ</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Questions, answered
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to know before you start.
              </p>
            </div>
            <div className="divide-y border-y">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group py-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium">
                    {f.q}
                    <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 pr-10 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- final CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-28 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-16 text-center shadow-xs sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_18rem_at_50%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
                Your next problem is one click away.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Create an account in seconds. Your progress is saved from the very first checkbox.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-12 px-6 text-[15px]">
                  <Link to={primaryCta.to}>
                    {authed ? 'Go to dashboard' : 'Create free account'} <ArrowRight />
                  </Link>
                </Button>
                {!authed && (
                  <DemoButton
                    size="lg"
                    label="Try the live demo"
                    className="h-12 px-6 text-[15px]"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const columns = [
    { title: 'Product', links: SECTIONS.map((s) => ({ label: s.label, href: `#${s.id}` })) },
    {
      title: 'Learn',
      links: [
        { label: 'DSA Sheet', to: '/sheet' },
        { label: 'Study calendar', to: '/calendar' },
        { label: 'Revision', to: '/revision' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Log in', to: '/login' },
        { label: 'Create account', to: '/register' },
      ],
    },
  ];
  return (
    <footer className="relative border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A structured way to learn, practise and revise Data Structures & Algorithms.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.label}>
                  {'to' in l && l.to ? (
                    <Link to={l.to} className="transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={(l as { href: string }).href}
                      className="transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} DSA Sheet. All rights reserved.</p>
          <p>Made for students preparing for coding interviews.</p>
        </div>
      </div>
    </footer>
  );
}

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="mb-10">
        <Logo />
      </Link>
      <p className="font-mono text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Button className="mt-6" asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
