import type { ApiResponse, AuthResponse } from '@dsa/shared';
import { useAuth } from '@/stores/auth';

const BASE = '/api/v1';
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal; raw?: boolean };

async function send(path: string, { method = 'GET', body, signal }: Options, token: string | null) {
  return fetch(`${BASE}${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Timezone': timeZone,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Single-flight refresh: many parallel 401s trigger exactly one /auth/refresh call.
let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await send('/auth/refresh', { method: 'POST' }, null);
      if (!res.ok) {
        // Read the (tiny) body so the request completes cleanly — no session is the normal case for visitors.
        await res.text().catch(() => undefined);
        return false;
      }
      const json = (await res.json()) as ApiResponse<AuthResponse>;
      if (!json.success) return false;
      useAuth.getState().setSession(json.data);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let res = await send(path, options, useAuth.getState().accessToken);

  // Access token expired → refresh silently once and retry.
  if (res.status === 401 && useAuth.getState().accessToken && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await send(path, options, useAuth.getState().accessToken);
    else useAuth.getState().clear();
  }

  if (options.raw) {
    if (!res.ok) throw new ApiError(res.status, 'HTTP_ERROR', `Request failed (${res.status})`);
    return (await res.blob()) as T;
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !json || !json.success) {
    const err = json && !json.success ? json.error : null;
    throw new ApiError(
      res.status,
      err?.code ?? 'NETWORK_ERROR',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.details as never,
    );
  }
  return json.data;
}
