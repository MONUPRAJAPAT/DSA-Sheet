import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Brand mark: three ascending bars — Easy → Medium → Hard, i.e. steady progress. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient
          id={`${id}-shine`}
          x1="16"
          y1="0"
          x2="16"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
      <rect width="32" height="16" rx="8" fill={`url(#${id}-shine)`} />
      <rect x="7.5" y="16.5" width="4.5" height="8" rx="2.25" fill="#fff" fillOpacity=".55" />
      <rect x="13.75" y="12" width="4.5" height="12.5" rx="2.25" fill="#fff" fillOpacity=".8" />
      <rect x="20" y="7.5" width="4.5" height="17" rx="2.25" fill="#fff" />
    </svg>
  );
}

export function Logo({
  className,
  compact,
  inverted,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span
          className={cn(
            'text-[17px] font-semibold tracking-[-0.02em]',
            inverted ? 'text-white' : 'text-foreground',
          )}
        >
          DSA<span className={inverted ? 'text-white/60' : 'text-muted-foreground'}> Sheet</span>
        </span>
      )}
    </span>
  );
}
