import type { Platform } from '@dsa/shared';
import { cn } from '@/lib/utils';

type Props = { className?: string };

export function YouTubeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden>
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0033" />
      <path d="M10 9v6l5.2-3z" fill="#fff" />
    </svg>
  );
}

export function LeetCodeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden fill="none">
      <path
        d="M14.5 3 7 10.8a3.2 3.2 0 0 0 0 4.4l3.6 3.7a3.2 3.2 0 0 0 4.5 0l1.9-2"
        stroke="#FFA116"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10.2 13h9.3"
        stroke="currentColor"
        strokeOpacity=".55"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="m17 8.6-2.2-2.2"
        stroke="currentColor"
        strokeOpacity=".75"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CodeforcesIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden>
      <rect x="2" y="9" width="5" height="11" rx="1.3" fill="#F5C43C" />
      <rect x="9.5" y="4" width="5" height="16" rx="1.3" fill="#1F8ACB" />
      <rect x="17" y="11" width="5" height="9" rx="1.3" fill="#B21E25" />
    </svg>
  );
}

export function ArticleIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-4', className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path
        d="M6 3h8l4 4v14H6z"
        className="fill-emerald-500/10 stroke-emerald-600 dark:stroke-emerald-400"
      />
      <path d="M9 12h6M9 16h6M9 8h3" className="stroke-emerald-600 dark:stroke-emerald-400" />
    </svg>
  );
}

export function PracticeIcon({ platform, className }: Props & { platform: Platform }) {
  return platform === 'Codeforces' ? (
    <CodeforcesIcon className={className} />
  ) : (
    <LeetCodeIcon className={className} />
  );
}
