import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const STORAGE_KEY = 'rockstyle-chess:music-enabled';

// Lazily created (not eagerly like soundEffects.ts's SFX players) -- this is
// a single ~75s looping track, not a tiny bundled clip, so there's no reason
// to pay its load cost before the menu is actually reached.
let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(require('../../assets/sounds/mainMenuBackground.wav'));
    player.loop = true;
  }
  return player;
}

// Same cached-variable-in-front-of-AsyncStorage pattern as soundEffects.ts.
// null = not yet loaded from storage (treated as "on", matching this
// preference's default, so music isn't silently skipped before the async
// load resolves).
let enabledCache: boolean | null = null;

// Tracks whether the menu (as opposed to gameplay) is the current screen,
// independent of the enabled/disabled preference -- so toggling the setting
// mid-menu can start/stop playback immediately without _layout.tsx having to
// re-derive "are we on a menu screen" itself.
let wantsToPlay = false;

export async function loadMusicPreference(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  enabledCache = stored !== 'false';
  return enabledCache;
}

export async function setMusicEnabled(value: boolean): Promise<void> {
  enabledCache = value;
  await AsyncStorage.setItem(STORAGE_KEY, String(value));
  if (wantsToPlay) {
    if (value) getPlayer().play();
    else getPlayer().pause();
  }
}

// Menu screens call this on focus; a no-op if already playing or disabled.
export function playMenuMusic(): void {
  wantsToPlay = true;
  if (enabledCache === false) return;
  const p = getPlayer();
  if (!p.playing) p.play();
}

// Gameplay screens call this on focus.
export function stopMenuMusic(): void {
  wantsToPlay = false;
  player?.pause();
}
