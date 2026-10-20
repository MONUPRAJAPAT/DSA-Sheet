export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PLATFORMS = ['LeetCode', 'Codeforces', 'GeeksforGeeks'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PROGRESS_STATUSES = ['todo', 'attempted', 'solved'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const EVENT_TYPES = ['study', 'revision', 'contest', 'custom'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ['pending', 'done', 'missed'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_SOURCES = ['manual', 'auto-plan', 'spaced-repetition'] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

/** Spaced-repetition schedule: days after solving at which a revision is due. */
export const REVISION_INTERVALS_DAYS = [1, 3, 7, 21] as const;

/** 0 = Sunday … 6 = Saturday (matches Date#getDay). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
