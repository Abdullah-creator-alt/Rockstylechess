import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const STORAGE_KEY = 'rockstyle-chess:music-enabled';

// Lazily created (not eagerly like soundEffects.ts's SFX players) -- this is
// a non-trivial track, not a tiny bundled clip, so there's no reason to pay
// its load cost before the menu is actually reached.
//
// The track is split into a one-shot intro plus a seamlessly loopable tail
// (two separate files, since expo-audio's `loop` restarts the whole source
// rather than looping a sub-region). `phase` tracks which one is current;
// once the intro finishes it flips to 'loop' for the rest of the app's
// lifetime, so returning to the menu later resumes the loop, not the intro.
let introPlayer: AudioPlayer | null = null;
let loopPlayer: AudioPlayer | null = null;
let phase: 'intro' | 'loop' = 'intro';

function getIntroPlayer(): AudioPlayer {
  if (!introPlayer) {
    introPlayer = createAudioPlayer(require('../../assets/sounds/mainMenuFixed_intro.wav'));
    introPlayer.loop = false;
    introPlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && phase === 'intro') {
        phase = 'loop';
        if (wantsToPlay && enabledCache !== false) getLoopPlayer().play();
      }
    });
  }
  return introPlayer;
}

function getLoopPlayer(): AudioPlayer {
  if (!loopPlayer) {
    loopPlayer = createAudioPlayer(require('../../assets/sounds/mainMenuFixed_loop.wav'));
    loopPlayer.loop = true;
  }
  return loopPlayer;
}

function getPlayer(): AudioPlayer {
  return phase === 'intro' ? getIntroPlayer() : getLoopPlayer();
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
  introPlayer?.pause();
  loopPlayer?.pause();
}
