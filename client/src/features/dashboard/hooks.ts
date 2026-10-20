import { useQuery } from '@tanstack/react-query';
import type { CalendarEventDTO, HeatmapDay, StatsDTO } from '@dsa/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';

export const useStats = () =>
  useQuery({ queryKey: qk.stats, queryFn: () => api<StatsDTO>('/progress/stats') });
export const useHeatmap = () =>
  useQuery({ queryKey: qk.heatmap, queryFn: () => api<HeatmapDay[]>('/progress/heatmap') });
export const useAgenda = () =>
  useQuery({
    queryKey: qk.agenda,
    queryFn: () =>
      api<{ today: string; events: CalendarEventDTO[]; overdue: CalendarEventDTO[] }>(
        '/calendar/agenda',
      ),
  });
