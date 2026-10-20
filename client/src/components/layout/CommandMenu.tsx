import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { CircleCheck, Search } from 'lucide-react';
import { DifficultyBadge } from '@/components/shared/DifficultyBadge';
import { useProblemIndex, useProgress } from '@/features/sheet/hooks';
import { NAV } from './nav';

/** ⌘K / Ctrl+K palette: jump to any page or any of the problems in the sheet. */
export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { list } = useProblemIndex();
  const { map } = useProgress();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(to);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search problems and pages
          </DialogPrimitive.Description>
          <Command
            loop
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase"
          >
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search problems, topics or pages…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                No results for “{query}”.
              </Command.Empty>
              <Command.Group heading="Pages">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <Command.Item
                    key={to}
                    value={`page ${label}`}
                    onSelect={() => go(to)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Problems">
                {list.map(({ problem, topic, chapter }) => (
                  <Command.Item
                    key={problem.id}
                    value={`${problem.title} ${topic.title} ${chapter.title} ${problem.tags.join(' ')}`}
                    onSelect={() => go(`/sheet/${chapter.slug}?problem=${problem.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
                  >
                    <CircleCheck
                      className={
                        map.get(problem.id)?.status === 'solved'
                          ? 'size-4 text-easy'
                          : 'size-4 text-muted-foreground/40'
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{problem.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {chapter.title} › {topic.title}
                      </span>
                    </span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
