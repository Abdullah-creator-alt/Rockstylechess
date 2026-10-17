import AsyncStorage from '@react-native-async-storage/async-storage';

import { INTERSTITIAL_RULES } from './adsConfig';
import type { InterstitialPlacement } from './types';

// Persisted interstitial pacing counters. Same cached-variable-in-front-of-
// AsyncStorage pattern as src/lib/guestMode.ts: the in-memory copy is the
// source of truth for the session, storage is best-effort (a failed write only
// means a counter resets after a restart -- worst case one extra/missed ad).
const STORAGE_KEY = 'rockstyle-chess:ad-frequency';

interface FrequencyState {
  matchesCompleted: number; // lifetime, for the "not in the first games" rule
  matchesSinceAd: number;
  puzzlesSinceAd: number;
  lastInterstitialAt: number; // epoch ms, 0 = never
}

const EMPTY: FrequencyState = { matchesCompleted: 0, matchesSinceAd: 0, puzzlesSinceAd: 0, lastInterstitialAt: 0 };

let cached: FrequencyState | null = null;

async function load(): Promise<FrequencyState> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cached = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<FrequencyState>) } : { ...EMPTY };
  } catch {
    cached = { ...EMPTY };
  }
  return cached;
}

async function save(state: FrequencyState): Promise<void> {
  cached = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

// Called once per finished match (result screen mount).
export async function recordMatchCompleted(): Promise<void> {
  const s = await load();
  await save({ ...s, matchesCompleted: s.matchesCompleted + 1, matchesSinceAd: s.matchesSinceAd + 1 });
}

// Called each time the player moves on from a solved puzzle.
export async function recordPuzzleSolved(): Promise<void> {
  const s = await load();
  await save({ ...s, puzzlesSinceAd: s.puzzlesSinceAd + 1 });
}

export async function shouldShowInterstitial(placement: InterstitialPlacement, now = Date.now()): Promise<boolean> {
  const s = await load();
  if (now - s.lastInterstitialAt < INTERSTITIAL_RULES.minGapMs) return false;
  if (placement === 'result-exit') {
    return (
      s.matchesCompleted > INTERSTITIAL_RULES.matchesBeforeFirst &&
      s.matchesSinceAd >= INTERSTITIAL_RULES.matchesBetween
    );
  }
  return s.puzzlesSinceAd >= INTERSTITIAL_RULES.puzzlesBetween;
}

// An interstitial of either kind resets both counters, so the two placements
// share one pacing budget instead of stacking.
export async function recordInterstitialShown(now = Date.now()): Promise<void> {
  const s = await load();
  await save({ ...s, matchesSinceAd: 0, puzzlesSinceAd: 0, lastInterstitialAt: now });
}
