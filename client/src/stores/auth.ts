import { create } from 'zustand';
import type { AuthResponse, UserDTO } from '@dsa/shared';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: UserDTO | null;
  /** Kept in memory only — never in localStorage — so XSS cannot exfiltrate it. */
  accessToken: string | null;
  setSession: (session: AuthResponse) => void;
  setUser: (user: UserDTO) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: 'anonymous' }),
}));
