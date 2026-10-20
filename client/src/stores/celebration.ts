import { create } from 'zustand';

export interface ChapterCelebration {
  chapterTitle: string;
  problems: number;
  totalSolved: number;
  totalProblems: number;
  next: { title: string; slug: string } | null;
}

export const useCelebration = create<{
  chapter: ChapterCelebration | null;
  showChapter: (c: ChapterCelebration) => void;
  close: () => void;
}>((set) => ({
  chapter: null,
  showChapter: (chapter) => set({ chapter }),
  close: () => set({ chapter: null }),
}));
