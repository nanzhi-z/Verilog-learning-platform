import type { Stage, Chapter } from './types';
import { basics } from './basics';
import { sequential } from './sequential';
import { practice } from './practice';
import { apps } from './apps';

export const stages: Stage[] = [basics, sequential, practice, apps];
export const chapters: Chapter[] = stages.flatMap((s) => s.chapters);
export const chapterIndex = new Map(chapters.map((c) => [c.id, c]));

export function chapterNeighbors(id: string): { prev: Chapter | null; next: Chapter | null } {
  const i = chapters.findIndex((c) => c.id === id);
  return {
    prev: i > 0 ? chapters[i - 1] : null,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null,
  };
}

export { exKey } from './types';
export type { Block, Exercise, Chapter, Stage } from './types';
