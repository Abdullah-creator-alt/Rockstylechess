import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { PUZZLES } from './puzzleCatalog';

// Client-only puzzle progress -- there is no server persistence of puzzle
// attempts (see (play)/README.md). Solved puzzle ids live in AsyncStorage
// under one key and are mirrored in an in-memory Set that is the synchronous
// source of truth for the whole app. Mirrors playerId.ts's cached-module
// pattern, plus a useSyncExternalStore subscription so screens re-render when
// a solve lands on another screen.

const STORAGE_KEY = 'rockstyle-chess:solved-puzzles';

/** The denominator for every "N / TOTAL solved" readout. */
export const PUZZLE_TOTAL = PUZZLES.length;

// solvedSet is mutated in place; `snapshot` is a frozen view of it that only
// gets a NEW reference when something actually changes -- useSyncExternalStore
// compares snapshots by identity, so returning a fresh ref every call would
// loop forever. Only markPuzzleSolved() and loadSolvedPuzzles() may reassign it.
const solvedSet = new Set<string>();
let snapshot: ReadonlySet<string> = new Set();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Read the persisted solved ids once and union-merge them into the in-memory
 * set (never clobbers ids added since app start, so a solve recorded in the
 * first few ms after mount survives hydration). Idempotent and cheap to call
 * again -- used both on first mount and defensively on screen focus.
 */
export async function loadSolvedPuzzles(): Promise<ReadonlySet<string>> {
  let added = false;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === 'string' && !solvedSet.has(id)) {
            solvedSet.add(id);
            added = true;
          }
        }
      }
    }
  } catch (error) {
    console.log('Failed to load solved puzzles', error);
  }
  // Emit on the first hydration too (even with nothing stored), so screens
  // gated on `hydrated` re-render once the read completes.
  if (added || !hydrated) {
    snapshot = new Set(solvedSet);
    hydrated = true;
    emit();
  } else {
    hydrated = true;
  }
  return snapshot;
}

/** Synchronous in-memory check; false until (and unless) hydration has run. */
export function isPuzzleSolved(id: string): boolean {
  return solvedSet.has(id);
}

/** getSnapshot for useSyncExternalStore -- stable ref between real mutations. */
export function getSolvedSnapshot(): ReadonlySet<string> {
  return snapshot;
}

export function getSolvedCount(): number {
  return snapshot.size;
}

/** Whether the persisted solved set has been read at least once. */
export function isSolvedHydrated(): boolean {
  return hydrated;
}

/**
 * Record a solved puzzle. No-op when already solved. Fire-and-forget: the
 * in-memory set + subscribers update immediately; a persistence failure only
 * logs (the id is still remembered for this session).
 */
export async function markPuzzleSolved(id: string): Promise<void> {
  if (solvedSet.has(id)) return;
  solvedSet.add(id);
  snapshot = new Set(solvedSet);
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...solvedSet]));
  } catch (error) {
    console.log('Failed to persist solved puzzle', error);
  }
}

export function subscribeSolved(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Subscribe a component to the solved-puzzle set. Hydrates from storage on
 * first mount; re-renders whenever markPuzzleSolved() runs anywhere.
 */
export function usePuzzleProgress(): {
  solved: ReadonlySet<string>;
  count: number;
  total: number;
  /** False until the persisted set has been read once (see loadSolvedPuzzles,
   *  which emits on that first read so this flips with a re-render). */
  hydrated: boolean;
  isSolved: (id: string) => boolean;
} {
  const solved = useSyncExternalStore(subscribeSolved, getSolvedSnapshot, getSolvedSnapshot);

  useEffect(() => {
    void loadSolvedPuzzles();
  }, []);

  return {
    solved,
    count: solved.size,
    total: PUZZLE_TOTAL,
    hydrated,
    isSolved: (id: string) => solved.has(id),
  };
}
