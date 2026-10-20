import { cn } from '@/lib/utils';

/** A real screenshot of the app in a minimal browser frame; swaps with the active theme. */
export function ProductShot({
  name,
  alt,
  className,
}: {
  name: 'dashboard' | 'sheet' | 'calendar';
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl shadow-primary/10 ring-1 ring-black/[0.03] dark:shadow-black/40',
        className,
      )}
    >
      <div className="flex h-9 items-center gap-1.5 border-b bg-muted/50 px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <img
        src={`/preview/${name}-light.jpg`}
        alt={alt}
        width={2880}
        height={1800}
        loading={name === 'dashboard' ? 'eager' : 'lazy'}
        className="block w-full dark:hidden"
      />
      <img
        src={`/preview/${name}-dark.jpg`}
        alt={alt}
        width={2880}
        height={1800}
        loading="lazy"
        className="hidden w-full dark:block"
      />
    </div>
  );
}
