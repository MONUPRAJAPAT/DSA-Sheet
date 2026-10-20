import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';

export const SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'faq', label: 'FAQ' },
];

/** Transparent over the hero; gains a blurred surface (same colour as the page) once scrolled. */
export function LandingNav() {
  const authed = useAuth((s) => s.status === 'authenticated');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open
          ? 'border-b border-border/70 bg-background/80 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-6">
        <Link to="/" aria-label="DSA Sheet home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {authed ? (
            <Button asChild size="sm" className="h-9 px-4">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden h-9 px-3.5 sm:inline-flex"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild className="hidden h-9 px-4 sm:inline-flex">
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/70 px-5 pt-2 pb-5 md:hidden">
          <nav className="flex flex-col" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[15px] text-muted-foreground hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
          {!authed && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
