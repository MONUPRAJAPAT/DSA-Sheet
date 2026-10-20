import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { AuthResponse, LoginInput, RegisterInput } from '@dsa/shared';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { useAuth } from '@/stores/auth';

function useSessionMutation<TInput>(path: string, welcome: (r: AuthResponse) => string) {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  return useMutation({
    mutationFn: (input: TInput) => api<AuthResponse>(path, { method: 'POST', body: input ?? {} }),
    onSuccess: (session) => {
      queryClient.clear();
      setSession(session);
      toast.success(welcome(session));
      const next = new URLSearchParams(window.location.search).get('next');
      navigate(next?.startsWith('/') ? next : '/dashboard', { replace: true });
    },
  });
}

export const useLogin = () =>
  useSessionMutation<LoginInput>(
    '/auth/login',
    (r) => `Welcome back, ${r.user.name.split(' ')[0]}!`,
  );
export const useRegister = () =>
  useSessionMutation<RegisterInput>(
    '/auth/register',
    (r) => `Account created — welcome, ${r.user.name.split(' ')[0]}!`,
  );
export const useDemoLogin = () =>
  useSessionMutation<void>('/auth/demo', () => 'Signed in to the demo account');

export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      useAuth.getState().clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
