import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the player has *explicitly* chosen "Continue as Guest" on the
// sign-in screen. Distinct from "has no auth token": a fresh install or a
// just-logged-out user has no token AND no guest choice, so the entry route
// (src/app/index.tsx) sends them to /sign-in to decide. Once they tap
// "Continue as Guest" this latches so later launches go straight to /home;
// logout / delete-account clear it so the sign-in gate comes back.
const STORAGE_KEY = 'rockstyle-chess:guest-mode';

let cached: boolean | undefined; // undefined = not read from storage yet

export async function getGuestMode(): Promise<boolean> {
  if (cached !== undefined) return cached;
  try {
    cached = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
  } catch {
    cached = false;
  }
  return cached;
}

export async function setGuestMode(on: boolean): Promise<void> {
  cached = on;
  try {
    if (on) await AsyncStorage.setItem(STORAGE_KEY, '1');
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort -- the in-memory cache still reflects the choice this session
  }
}
