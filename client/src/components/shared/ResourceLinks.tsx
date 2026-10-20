import type { Resources } from '@dsa/shared';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArticleIcon, PracticeIcon, YouTubeIcon } from './PlatformIcon';

interface Props {
  resources: Resources;
  onOpen?: () => void;
  size?: 'sm' | 'md';
  labels?: boolean;
  className?: string;
}

/** The three learning resources required for every topic & problem: video, practice and article. */
export function ResourceLinks({ resources, onOpen, size = 'sm', labels, className }: Props) {
  const items = [
    {
      href: resources.youtube,
      label: 'Video',
      tip: 'Watch video explanation',
      icon: <YouTubeIcon />,
    },
    {
      href: resources.practice.url,
      label: resources.practice.platform,
      tip: `Practice on ${resources.practice.platform}`,
      icon: <PracticeIcon platform={resources.practice.platform} />,
    },
    {
      href: resources.article,
      label: 'Article',
      tip: 'Read the theory article',
      icon: <ArticleIcon />,
    },
  ];
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {items.map((item) => (
        <Tooltip key={item.label} content={item.tip}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            aria-label={item.tip}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent font-medium text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground hover:shadow-xs',
              size === 'sm' ? 'size-8' : 'h-8 px-2.5 text-xs',
              labels && 'w-auto px-2.5 text-xs',
            )}
          >
            {item.icon}
            {labels && <span>{item.label}</span>}
          </a>
        </Tooltip>
      ))}
    </div>
  );
}
