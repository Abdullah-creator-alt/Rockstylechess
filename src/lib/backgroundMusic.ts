import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

const STORAGE_KEY = 'rockstyle-chess:music-enabled';

// Browsers block audio autoplay before the user has interacted with the
// page at all -- expo-audio's web player (AudioModule.web.ts) calls the
// underlying <audio> element's play() (which returns a Promise) but its own
// play() wrapper is typed/declared `void` and never catches that promise,
// so a blocked autoplay surfaces as an unhandled rejection we have no local
// try/catch or .catch() access to from this file's call sites below. This
// is the one targeted, filtered way to stop that specific, harmless case
// from crashing the page as an uncaught error -- anything else still
// surfaces normally.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event.reason?.message ?? event.reason);
    if (event.reason?.name === 'NotAllowedError' || /play method is not allowed|play\(\) failed/i.test(message)) {
      event.preventDefault();
    }
  });
}

// Lazily created (not eagerly like soundEffects.ts's SFX players) -- this is
// non-trivial background music, not a tiny bundled clip, so there's no
// reason to pay its load cost before the menu is actually reached.
//
// Three tracks played back-to-back in a fixed cycle (1 -> 2 -> 3 -> 1 -> ...)
// rather than one file with expo-audio's `loop`, since that flag restarts a
// single source rather than advancing through several. Each track is its
// own AudioPlayer with a `playbackStatusUpdate` listener watching
// `didJustFinish`; when the current track ends, `advance()` moves to the
// next index (wrapping via modulo) and plays it. All three files were
// loudness-normalized to -23.5 LUFS (matching the level established for the
// prior intro/loop track) with a short exponential fade-in baked in at
// encode time, so no in-app fade logic is needed at the handoff points.
const TRACK_SOURCES = [
  require('../../assets/sounds/mainMenuFixed_track1.m4a'),
  require('../../assets/sounds/mainMenuFixed_track2.m4a'),
  require('../../assets/sounds/mainMenuFixed_track3.m4a'),
];

const players: (AudioPlayer | null)[] = TRACK_SOURCES.map(() => null);
let currentIndex = 0;

function getPlayer(index: number): AudioPlayer {
  let player = players[index];
  if (!player) {
    player = createAudioPlayer(TRACK_SOURCES[index]);
    player.loop = false;
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && currentIndex === index) advance();
    });
    players[index] = player;
  }
  return player;
}

// Called when the current track finishes naturally -- moves to the next one
// in the cycle and plays it from the start (the player that just finished
// sits at its own end position until it's reached again next cycle).
function advance(): void {
  currentIndex = (currentIndex + 1) % TRACK_SOURCES.length;
  if (wantsToPlay && enabledCache !== false) {
    const next = getPlayer(currentIndex);
    next.seekTo(0);
    next.play();
  }
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
    if (value) getPlayer(currentIndex).play();
    else getPlayer(currentIndex).pause();
  }
}

// Menu screens call this on focus; a no-op if already playing or disabled.
export function playMenuMusic(): void {
  wantsToPlay = true;
  if (enabledCache === false) return;
  const p = getPlayer(currentIndex);
  if (!p.playing) p.play();
}

// Gameplay screens call this on focus.
export function stopMenuMusic(): void {
  wantsToPlay = false;
  players.forEach((p) => p?.pause());
}

// An ad took over the screen (and brings its own audio). Pauses whatever is
// playing but, unlike stopMenuMusic(), leaves `wantsToPlay` alone -- so if the
// player navigates to gameplay while the ad is up, resumeMenuMusicAfterAd()
// correctly stays silent.
let pausedForAd = false;

export function pauseMenuMusicForAd(): void {
  if (!wantsToPlay || enabledCache === false) return;
  pausedForAd = true;
  players.forEach((p) => p?.pause());
}

export function resumeMenuMusicAfterAd(): void {
  if (!pausedForAd) return;
  pausedForAd = false;
  if (wantsToPlay && enabledCache !== false) {
    const p = getPlayer(currentIndex);
    if (!p.playing) p.play();
  }
}
