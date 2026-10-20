import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Search } from 'lucide-react';
import { LogoMark } from '@/components/shared/Logo';
import { CelebrationDialog } from '@/components/shared/CelebrationDialog';
import { CommandMenu } from './CommandMenu';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Link to="/dashboard" className="lg:hidden" aria-label="Dashboard">
            <LogoMark />
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-md min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition hover:border-ring/40 hover:text-foreground lg:flex-none"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">Search problems…</span>
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          id="main"
          key={pathname.split('/')[1]}
          className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 sm:px-6 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
      <CelebrationDialog />
    </div>
  );
}
