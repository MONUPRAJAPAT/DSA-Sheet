import type { Difficulty, ProblemDTO, ProgressDTO } from '@dsa/shared';

export type StatusFilter = 'all' | 'unsolved' | 'solved' | 'attempted' | 'starred';
export interface Filters {
  q: string;
  difficulty: Difficulty | 'all';
  status: StatusFilter;
}
export const defaultFilters: Filters = { q: '', difficulty: 'all', status: 'all' };

export function matches(p: ProblemDTO, progress: ProgressDTO | undefined, f: Filters) {
  if (f.difficulty !== 'all' && p.difficulty !== f.difficulty) return false;
  const status = progress?.status ?? 'todo';
  if (f.status === 'solved' && status !== 'solved') return false;
  if (f.status === 'unsolved' && status === 'solved') return false;
  if (f.status === 'attempted' && status !== 'attempted') return false;
  if (f.status === 'starred' && !progress?.starred) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!p.title.toLowerCase().includes(q) && !p.tags.some((t) => t.includes(q))) return false;
  }
  return true;
}

export const isFiltering = (f: Filters) =>
  f.q !== '' || f.difficulty !== 'all' || f.status !== 'all';
