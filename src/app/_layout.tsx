import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { PlayerProfileProvider } from '@/hooks/usePlayerProfile';
import { loadMusicPreference, playMenuMusic, stopMenuMusic } from '@/lib/backgroundMusic';
import { loadSoundFxPreference } from '@/lib/soundEffects';

// The only screens where a live game is actually being played -- (play)/
// also holds lobby/setup/replay screens (matchmaking, game-room, setup,
// tournaments, puzzles, bots, replay, result-placeholder) that are still
// "menu", so this can't just be a route-group check.
const GAMEPLAY_ROUTES = new Set(['/match', '/puzzle-match']);

// Keep the native splash screen visible until fonts are ready, so there's
// no flash of unstyled text on first launch.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    Oswald_600SemiBold,
    Inter_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Not gated on splash-hide (unlike fonts) -- a quick local AsyncStorage
  // read with no visible flash-of-content risk. Loaded once here, before any
  // gameplay screen could call playSound(), so a previously-disabled
  // preference isn't briefly ignored just because the user never happened to
  // open Settings this session (soundEffects.ts's cache defaults to "on"
  // until loaded).
  useEffect(() => {
    loadSoundFxPreference();
    loadMusicPreference();
  }, []);

  // Menu music: on everywhere except the two actual gameplay boards, driven
  // purely by route rather than a per-screen mount/unmount call -- this one
  // effect covers every current and future "menu" screen (home, settings,
  // shop, matchmaking/setup lobbies, replay, ...) without each of them
  // needing to remember to start/stop it themselves. Gated on the same
  // fontsLoaded/fontError condition as the splash-hide effect above -- this
  // effect still fires (with the native splash visible and pathname at its
  // initial route) while fonts are loading, and starting music under the
  // still-visible splash would contradict "after the splash screen".
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (GAMEPLAY_ROUTES.has(pathname)) {
      stopMenuMusic();
    } else {
      playMenuMusic();
    }
  }, [pathname, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlayerProfileProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bgBase },
            }}
          />
        </PlayerProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
