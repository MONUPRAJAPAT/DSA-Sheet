import { format } from 'date-fns';

/** Local calendar day as YYYY-MM-DD (matches the server's user-local date keys). */
export const toKey = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayKey = () => toKey(new Date());
export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};
export const addDaysKey = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const prettyDate = (key: string) => format(fromKey(key), 'EEE, d MMM');
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
