import type { EventType } from '@dsa/shared';

export const EVENT_META: Record<
  EventType,
  { label: string; dot: string; chip: string; color: string }
> = {
  study: {
    label: 'Study',
    dot: 'bg-study',
    chip: 'bg-study/12 text-study border-l-study',
    color: 'var(--study)',
  },
  revision: {
    label: 'Revision',
    dot: 'bg-revision',
    chip: 'bg-revision/12 text-revision border-l-revision',
    color: 'var(--revision)',
  },
  contest: {
    label: 'Contest',
    dot: 'bg-contest',
    chip: 'bg-contest/12 text-contest border-l-contest',
    color: 'var(--contest)',
  },
  custom: {
    label: 'Personal',
    dot: 'bg-custom',
    chip: 'bg-custom/12 text-custom border-l-custom',
    color: 'var(--custom)',
  },
};
