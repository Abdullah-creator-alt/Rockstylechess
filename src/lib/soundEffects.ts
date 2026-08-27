import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import type { MoveSoundKind } from './chessBoardSnapshot';

type SoundKind = MoveSoundKind | 'illegal';

// Eagerly instantiated once at module load -- expo-audio has no dedicated
// "preload" API, and these are small bundled local files with no real load
// latency, so this just avoids first-play instantiation cost. One player
// per sound, not a pool -- chess moves are inherently turn-based/sequential,
// so true overlapping playback of the SAME cue isn't a realistic case.
const players: Record<SoundKind, AudioPlayer> = {
  move: createAudioPlayer(require('../../assets/sounds/move.wav')),
  capture: createAudioPlayer(require('../../assets/sounds/capture.wav')),
  castle: createAudioPlayer(require('../../assets/sounds/castle.wav')),
  check: createAudioPlayer(require('../../assets/sounds/check.wav')),
  checkmate: createAudioPlayer(require('../../assets/sounds/checkmate.wav')),
  illegal: createAudioPlayer(require('../../assets/sounds/illegal.wav')),
};

const STORAGE_KEY = 'rockstyle-chess:sound-fx-enabled';

// Mirrors playerId.ts's cached-variable-in-front-of-AsyncStorage pattern.
// null = not yet loaded from storage (playSound treats that as "on", same
// as control-core.tsx's current default, so sound isn't silently dropped
// before the async load resolves).
let enabledCache: boolean | null = null;

export async function loadSoundFxPreference(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  enabledCache = stored !== 'false';
  return enabledCache;
}

export async function setSoundFxEnabled(value: boolean): Promise<void> {
  enabledCache = value;
  await AsyncStorage.setItem(STORAGE_KEY, String(value));
}

export function playSound(kind: SoundKind): void {
  if (enabledCache === false) return;
  const player = players[kind];
  // seekTo is async (unlike play()) -- must resolve before play() or a
  // rapid repeat trigger can start playback from wherever the previous
  // play left off instead of the beginning.
  player.seekTo(0).then(() => player.play());
}
