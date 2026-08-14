import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = 'rockstyle-chess:guest-id';

let cachedId: string | null = null;

// expo-crypto's web fallback (ExpoCrypto.web.js) delegates straight to
// window.crypto.randomUUID(), which browsers only expose in a secure context
// (https, or the exact hostname "localhost") -- an http://<lan-ip>:8081 dev
// URL doesn't qualify, so it throws "getCrypto().randomUUID is not a
// function" there. Native (Expo Go) never hits this path. A guest id isn't
// security-sensitive (just a matchmaking/reconnection key), so a plain v4
// fallback is fine.
function generateUUID(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

// A persisted guest identity used for matchmaking/reconnection until real
// auth (Supabase, per (auth)/README.md) is wired up -- swapping this for a
// real user id later won't need to touch the socket protocol.
export async function getPlayerId(): Promise<string> {
  if (cachedId) return cachedId;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedId = stored;
    return stored;
  }
  const generated = generateUUID();
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  cachedId = generated;
  return generated;
}
