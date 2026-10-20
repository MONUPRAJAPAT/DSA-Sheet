import * as React from 'react';
import { cn } from '@/lib/utils';

/** Lightweight native select styled to match the design system (best mobile UX + a11y for free). */
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 cursor-pointer rounded-lg border border-input bg-card px-3 pr-8 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
        "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}
