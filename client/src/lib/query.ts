import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

export const qk = {
  sheet: ['sheet'] as const,
  progress: ['progress'] as const,
  stats: ['progress', 'stats'] as const,
  heatmap: ['progress', 'heatmap'] as const,
  events: (from: string, to: string) => ['calendar', 'events', from, to] as const,
  calendar: ['calendar'] as const,
  agenda: ['calendar', 'agenda'] as const,
  plan: ['calendar', 'plan'] as const,
};
