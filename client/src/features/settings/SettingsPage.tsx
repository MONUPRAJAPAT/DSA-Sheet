import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Check,
  LoaderCircle,
  LogOut,
  Minus,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Sun,
} from 'lucide-react';
import type { UpdatePreferencesInput, UserDTO } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/shared/States';
import { initials } from '@/components/layout/UserMenu';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { WEEKDAY_LABELS } from '@/lib/dates';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn, pluralize } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useTheme, type Theme } from '@/stores/theme';
import { useLogout } from '@/features/auth/hooks';

/** Settings row: title + description on the left, controls on the right (stacks on mobile). */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 py-8 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function useSaveUser() {
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePreferencesInput) =>
      api<UserDTO>('/users/me', { method: 'PATCH', body }),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries({ queryKey: qk.stats });
    },
    onError: (e) => toast.error(e.message),
  });
}

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

export function SettingsPage() {
  usePageTitle('Settings');
  const user = useAuth((s) => s.user)!;
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const logout = useLogout();
  const saveProfile = useSaveUser();
  const savePrefs = useSaveUser();

  const [name, setName] = useState(user.name);
  const [dailyGoal, setDailyGoal] = useState(user.preferences.dailyGoal);
  const [studyDays, setStudyDays] = useState(user.preferences.studyDays);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const nameDirty = name.trim() !== user.name && name.trim().length >= 2;
  const prefsDirty =
    dailyGoal !== user.preferences.dailyGoal || !sameDays(studyDays, user.preferences.studyDays);

  const reset = useMutation({
    mutationFn: () => api('/progress', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.progress });
      qc.invalidateQueries({ queryKey: qk.calendar });
      toast.success('Progress reset', { description: 'A fresh start — your sheet is ready.' });
    },
  });
  const logoutAll = useMutation({
    mutationFn: () => api('/auth/logout-all', { method: 'POST' }),
    onSuccess: () => logout.mutate(),
  });

  const themes: { value: Theme; label: string; icon: typeof Sun; preview: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      preview: 'bg-[#f7f8fb] [--p:#ffffff] [--l:#e5e7ef]',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      preview: 'bg-[#0f1117] [--p:#181b24] [--l:#2a2e3b]',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      preview: 'bg-[linear-gradient(135deg,#f7f8fb_50%,#0f1117_50%)] [--p:#c9cdd8] [--l:#9aa0b0]',
    },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage your profile, study preferences and account."
      />

      {/* Profile header */}
      <Card className="mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-lg font-semibold text-white shadow-sm">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
        </p>
      </Card>

      <div className="divide-y">
        <Section title="Profile" description="This is how your name appears across the app.">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (nameDirty)
                saveProfile.mutate(
                  { name: name.trim() },
                  { onSuccess: () => toast.success('Profile updated') },
                );
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <Button type="submit" disabled={!nameDirty || saveProfile.isPending}>
              {saveProfile.isPending ? <LoaderCircle className="animate-spin" /> : null} Save
            </Button>
          </form>
        </Section>

        <Section
          title="Study preferences"
          description="Used by your dashboard goal and as defaults for the study-plan generator."
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
              <div>
                <p className="text-sm font-medium">Daily goal</p>
                <p className="text-xs text-muted-foreground">
                  {pluralize(dailyGoal, 'problem')} per study day
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setDailyGoal((g) => Math.max(1, g - 1))}
                  aria-label="Decrease daily goal"
                  disabled={dailyGoal <= 1}
                >
                  <Minus />
                </Button>
                <span
                  className="w-8 text-center text-lg font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {dailyGoal}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setDailyGoal((g) => Math.min(20, g + 1))}
                  aria-label="Increase daily goal"
                  disabled={dailyGoal >= 20}
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <div className="space-y-2.5">
              <Label>Study days</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((l, d) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={studyDays.includes(d)}
                    onClick={() =>
                      setStudyDays((s) =>
                        s.includes(d)
                          ? s.length > 1
                            ? s.filter((x) => x !== d)
                            : s
                          : [...s, d].sort(),
                      )
                    }
                    className={cn(
                      'cursor-pointer rounded-lg border py-2 text-xs font-semibold transition',
                      studyDays.includes(d)
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {pluralize(studyDays.length, 'study day')} a week · about{' '}
                {studyDays.length * dailyGoal} problems weekly
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() =>
                  savePrefs.mutate(
                    { dailyGoal, studyDays },
                    { onSuccess: () => toast.success('Study preferences saved') },
                  )
                }
                disabled={!prefsDirty || savePrefs.isPending}
              >
                {savePrefs.isPending ? <LoaderCircle className="animate-spin" /> : null} Save
                preferences
              </Button>
              {prefsDirty && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDailyGoal(user.preferences.dailyGoal);
                    setStudyDays(user.preferences.studyDays);
                  }}
                >
                  Discard
                </Button>
              )}
            </div>
          </div>
        </Section>

        <Section title="Appearance" description="Choose how DSA Sheet looks to you.">
          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ value, label, icon: Icon, preview }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={cn(
                  'group cursor-pointer overflow-hidden rounded-xl border text-left transition',
                  theme === value ? 'ring-2 ring-primary' : 'hover:border-ring/40',
                )}
              >
                <div className={cn('flex h-20 gap-1.5 p-2.5', preview)}>
                  <span className="w-1/4 rounded-md bg-[var(--p)]" />
                  <span className="flex flex-1 flex-col gap-1.5 rounded-md bg-[var(--p)] p-2">
                    <span className="h-1.5 w-3/4 rounded-full bg-[var(--l)]" />
                    <span className="h-1.5 w-1/2 rounded-full bg-[var(--l)]" />
                    <span className="mt-auto h-1.5 w-1/3 rounded-full bg-primary" />
                  </span>
                </div>
                <div className="flex items-center gap-2 border-t bg-card px-3 py-2.5 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                  {theme === value && <Check className="ml-auto size-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Account" description="Manage your progress and active sessions.">
          <Card className="divide-y border-destructive/25">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Reset all progress</p>
                <p className="text-xs text-muted-foreground">
                  Clears every checkbox, note, star and revision. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw /> Reset progress
              </Button>
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Log out of all devices</p>
                <p className="text-xs text-muted-foreground">
                  Revokes every active session, including this one.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setConfirmLogoutAll(true)}
              >
                <LogOut /> Log out everywhere
              </Button>
            </div>
          </Card>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all progress?"
        description="Every solved problem, note, star and scheduled revision will be permanently removed."
        confirmLabel="Yes, reset everything"
        destructive
        onConfirm={() => reset.mutate()}
      />
      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Log out of all devices?"
        description="You’ll need to log in again on every device, including this one."
        confirmLabel="Log out everywhere"
        onConfirm={() => logoutAll.mutate()}
      />
    </div>
  );
}
