import { BookOpen, CalendarDays, LayoutDashboard, Repeat, Settings } from 'lucide-react';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/sheet', label: 'DSA Sheet', short: 'Sheet', icon: BookOpen },
  { to: '/calendar', label: 'Study Calendar', short: 'Calendar', icon: CalendarDays },
  { to: '/revision', label: 'Revision', short: 'Revise', icon: Repeat },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
] as const;
