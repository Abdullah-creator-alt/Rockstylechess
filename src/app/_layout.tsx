import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

// Keep the native splash screen visible until fonts are ready, so there's
// no flash of unstyled text on first launch.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.bgBase },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
