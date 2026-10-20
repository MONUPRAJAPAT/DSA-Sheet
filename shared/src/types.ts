import type {
  Difficulty,
  EventSource,
  EventStatus,
  EventType,
  Platform,
  ProgressStatus,
} from './constants';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Resources {
  youtube: string;
  practice: { platform: Platform; url: string };
  article: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  preferences: { dailyGoal: number; studyDays: number[]; targetDate: string | null };
  lastActive: { problemId: string | null; at: string | null };
  createdAt: string;
}

export interface AuthResponse {
  user: UserDTO;
  accessToken: string;
}

export interface ProblemDTO {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  resources: Resources;
  tags: string[];
  order: number;
}

export interface TopicDTO {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  description: string;
  resources: Resources;
  order: number;
  problems: ProblemDTO[];
}

export interface ChapterDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  problemCount: number;
  topics: TopicDTO[];
}

export interface SheetDTO {
  chapters: ChapterDTO[];
  totals: { problems: number; easy: number; medium: number; hard: number };
  version: string;
}

export interface ProgressDTO {
  problemId: string;
  status: ProgressStatus;
  starred: boolean;
  notes: string;
  solvedAt: string | null;
  updatedAt: string;
}

export interface StatsDTO {
  solved: number;
  total: number;
  byDifficulty: Record<Difficulty, { solved: number; total: number }>;
  byChapter: { chapterId: string; solved: number; total: number }[];
  streak: { current: number; longest: number };
  revisionsDue: number;
  continue: { problemId: string; title: string; chapterTitle: string; topicTitle: string } | null;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface CalendarEventDTO {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: EventType;
  status: EventStatus;
  source: EventSource;
  notes: string;
  problem: { id: string; title: string; difficulty: Difficulty; practiceUrl: string } | null;
  rolledOverFrom: string | null;
  overdue: boolean;
}

export interface PlanSummaryDTO {
  created: number;
  problemsScheduled: number;
  firstDate: string | null;
  lastDate: string | null;
  fitsBeforeTarget: boolean;
  unscheduled: number;
  suggestedDailyGoal: number;
}
