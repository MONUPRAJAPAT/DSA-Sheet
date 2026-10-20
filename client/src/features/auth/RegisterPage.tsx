import { Link } from 'react-router';
import { usePageTitle } from '@/lib/usePageTitle';
import { Check, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthLayout } from './AuthLayout';
import { DemoButton } from './DemoButton';
import { FormField } from './FormField';
import { useRegister } from './hooks';

export function RegisterPage() {
  usePageTitle('Create account');
  const signup = useRegister();
  const { register, handleSubmit, formState, watch } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });
  const password = watch('password') ?? '';
  const rules = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(password), label: 'A letter' },
    { ok: /\d/.test(password), label: 'A number' },
  ];

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your DSA preparation in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => signup.mutate(v))} className="space-y-4" noValidate>
        <FormField
          id="name"
          label="Full name"
          placeholder="Aarav Sharma"
          autoComplete="name"
          registration={register('name')}
          error={formState.errors.name?.message}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          registration={register('email')}
          error={formState.errors.email?.message}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          registration={register('password')}
          error={formState.errors.password?.message}
        />
        <ul
          className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs"
          aria-label="Password requirements"
        >
          {rules.map((r) => (
            <li
              key={r.label}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                r.ok ? 'text-easy' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-3.5 items-center justify-center rounded-full border',
                  r.ok ? 'border-easy bg-easy text-white' : 'border-input',
                )}
              >
                {r.ok && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
        {signup.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {signup.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={signup.isPending}>
          {signup.isPending ? (
            <>
              <LoaderCircle className="animate-spin" /> Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <DemoButton className="w-full" size="lg" />
    </AuthLayout>
  );
}
