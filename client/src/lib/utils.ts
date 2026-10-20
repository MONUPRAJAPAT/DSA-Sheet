import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pluralize = (n: number, word: string, plural = `${word}s`) =>
  `${n} ${n === 1 ? word : plural}`;

export const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
