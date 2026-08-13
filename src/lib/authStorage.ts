import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore keys are restricted to alphanumeric, ".", "-", and "_" --
// unlike AsyncStorage (playerId.ts's guest UUID key), a ":" here throws
// "Invalid key provided to SecureStore" at call time.
const STORAGE_KEY = 'rockstyle-chess-auth-token';

// A JWT is a credential, not a cosmetic identifier -- unlike playerId.ts's
// guest UUID (AsyncStorage is fine there), this uses SecureStore. expo-secure-store
// ships an empty stub on web (no Keychain/Keystore equivalent), so every method
// throws "is not a function" there -- fall back to localStorage on that platform.
let cachedToken: string | null | undefined; // undefined = not read from storage yet

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  const stored =
    Platform.OS === 'web' ? window.localStorage.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
  cachedToken = stored;
  return stored;
}

export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  if (Platform.OS === 'web') {
    window.localStorage.setItem(STORAGE_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
