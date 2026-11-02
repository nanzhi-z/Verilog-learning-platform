import { useCallback, useEffect, useState } from 'react';
import { chapters, chapterIndex, exKey } from './content';

const KEY = 'lv-progress-v1';

export interface Progress {
  completed: string[]; // exKeys "01/2"
  read: string[]; // chapter ids
  starred: string[]; // bookmarked / wrong-question exKeys
  notes: Record<string, string>; // exKey → personal note
}

const empty: Progress = { completed: [], read: [], starred: [], notes: {} };

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw);
    if (!Array.isArray(p.completed) || !Array.isArray(p.read)) return empty;
    return {
      completed: p.completed,
      read: p.read,
      starred: Array.isArray(p.starred) ? p.starred : [],
      notes: p.notes && typeof p.notes === 'object' ? p.notes : {},
    };
  } catch {
    return empty;
  }
}

let current: Progress = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useProgress(): Progress & {
  isDone: (cid: string, eid: string) => boolean;
  isRead: (cid: string) => boolean;
  complete: (cid: string, eid: string) => void;
  markRead: (cid: string) => void;
  reset: () => void;
  /** exercise unlocked? (first of chapter always; else previous done; chapter needs prev chapter complete) */
  unlocked: (cid: string, eid: string) => boolean;
  /** all exercises of a chapter completed */
  chapterDone: (cid: string) => boolean;
  /** chapter content accessible (reading + first exercise) */
  chapterUnlocked: (cid: string) => boolean;
  totalDone: number;
  /** starred / wrong-question book */
  isStarred: (cid: string, eid: string) => boolean;
  toggleStar: (cid: string, eid: string) => void;
  getNote: (cid: string, eid: string) => string;
  setNote: (cid: string, eid: string, text: string) => void;
} {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const doneSet = new Set(current.completed);
  const readSet = new Set(current.read);

  const isDone = useCallback(
    (cid: string, eid: string) => doneSet.has(exKey(cid, eid)),
    [doneSet]
  );
  const isRead = useCallback((cid: string) => readSet.has(cid), [readSet]);

  const chapterDone = useCallback(
    (cid: string) => {
      const ch = chapterIndex.get(cid);
      if (!ch) return false;
      return ch.exercises.every((e) => doneSet.has(exKey(cid, e.id)));
    },
    [doneSet]
  );

  const chapterUnlocked = useCallback(
    (cid: string) => {
      const i = chapters.findIndex((c) => c.id === cid);
      if (i <= 0) return true;
      return chapterDone(chapters[i - 1].id);
    },
    [chapterDone]
  );

  const unlocked = useCallback(
    (cid: string, eid: string) => {
      if (!chapterUnlocked(cid)) return false;
      const ch = chapterIndex.get(cid);
      if (!ch) return false;
      const i = ch.exercises.findIndex((e) => e.id === eid);
      if (i <= 0) return true;
      return doneSet.has(exKey(cid, ch.exercises[i - 1].id));
    },
    [chapterUnlocked, doneSet]
  );

  const complete = useCallback((cid: string, eid: string) => {
    const k = exKey(cid, eid);
    if (current.completed.includes(k)) return;
    current = { ...current, completed: [...current.completed, k] };
    emit();
  }, []);

  const markRead = useCallback((cid: string) => {
    if (current.read.includes(cid)) return;
    current = { ...current, read: [...current.read, cid] };
    emit();
  }, []);

  const reset = useCallback(() => {
    current = { completed: [], read: [], starred: [], notes: {} };
    emit();
  }, []);

  const isStarred = useCallback(
    (cid: string, eid: string) => current.starred.includes(exKey(cid, eid)),
    []
  );

  const toggleStar = useCallback((cid: string, eid: string) => {
    const k = exKey(cid, eid);
    if (current.starred.includes(k)) {
      current = { ...current, starred: current.starred.filter((x) => x !== k) };
    } else {
      current = { ...current, starred: [...current.starred, k] };
    }
    emit();
  }, []);

  const getNote = useCallback(
    (cid: string, eid: string) => current.notes[exKey(cid, eid)] ?? '',
    []
  );

  const setNote = useCallback((cid: string, eid: string, text: string) => {
    const k = exKey(cid, eid);
    const notes = { ...current.notes };
    if (text.trim()) notes[k] = text;
    else delete notes[k];
    current = { ...current, notes };
    emit();
  }, []);

  return {
    ...current,
    isDone,
    isRead,
    complete,
    markRead,
    reset,
    unlocked,
    chapterDone,
    chapterUnlocked,
    totalDone: current.completed.length,
    isStarred,
    toggleStar,
    getNote,
    setNote,
  };
}

export const totalExercises = chapters.reduce((a, c) => a + c.exercises.length, 0);
