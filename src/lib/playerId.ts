import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = 'rockstyle-chess:guest-id';

let cachedId: string | null = null;

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
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  cachedId = generated;
  return generated;
}
