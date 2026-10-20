import { Link } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@dsa/shared';
import { Button } from '@/components/ui/button';
import { AuthLayout } from './AuthLayout';
import { DemoButton } from './DemoButton';
import { FormField } from './FormField';
import { useLogin } from './hooks';

export function LoginPage() {
  usePageTitle('Log in');
  const login = useLogin();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up exactly where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
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
          placeholder="Enter your password"
          autoComplete="current-password"
          registration={register('password')}
          error={formState.errors.password?.message}
        />
        {login.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {login.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
          {login.isPending ? (
            <>
              <LoaderCircle className="animate-spin" /> Logging in…
            </>
          ) : (
            'Log in'
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
