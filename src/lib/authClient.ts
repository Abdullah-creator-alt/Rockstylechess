import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Baked into the client bundle at build time -- matches api.ts/socket.ts's
// own EXPO_PUBLIC_SERVER_URL fallback so all three point at the same server.
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

// expoClient's `storage` option must be *synchronous* (getItem returns
// `string | null` directly, not a Promise) -- expo-secure-store's sync
// getItem/setItem satisfy that on native. On web the SecureStore module
// throws on every method (no Keychain/Keystore equivalent there), so this
// falls back to localStorage, which is also synchronous -- same web/native
// split authStorage.ts uses for the actual bearer token below.
const syncStorage = {
  getItem: (key: string): string | null =>
    Platform.OS === 'web' ? window.localStorage.getItem(key) : SecureStore.getItem(key),
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web') window.localStorage.setItem(key, value);
    else SecureStore.setItem(key, value);
  },
};

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  plugins: [
    expoClient({
      scheme: 'rockstylechess',
      storagePrefix: 'rockstylechess',
      storage: syncStorage,
    }),
  ],
});

// The app doesn't use authClient's own cookie-backed session state (it
// already has a working token flow via authStorage.ts/api.ts/socket.ts) --
// this just extracts the portable bearer token betterAuth.ts's bearer()
// plugin puts on the response, via the same onSuccess hook the plugin's
// docs use, so callers can feed it into that existing flow unchanged.
function extractToken(headers: Headers): string | null {
  return headers.get('set-auth-token');
}

export async function signUpWithEmail(email: string, password: string): Promise<{ token: string }> {
  // The real display name is collected one screen later by pick-rockstar.tsx
  // (playerProfiles.displayName) -- this is just a placeholder to satisfy
  // better-auth's required `name` field on the user record.
  const name = email.split('@')[0] || email;
  let token: string | null = null;
  const { error } = await authClient.signUp.email(
    { email, password, name },
    { onSuccess: (ctx) => { token = extractToken(ctx.response.headers); } },
  );
  if (error || !token) throw new Error(error?.message ?? 'Something went wrong');
  return { token };
}

export async function signInWithEmail(email: string, password: string): Promise<{ token: string }> {
  let token: string | null = null;
  const { error } = await authClient.signIn.email(
    { email, password },
    { onSuccess: (ctx) => { token = extractToken(ctx.response.headers); } },
  );
  if (error || !token) throw new Error(error?.message ?? 'Something went wrong');
  return { token };
}
