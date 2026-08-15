import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getMyProfile, type PlayerProfile } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';

export type PlayerProfileStatus = 'loading' | 'ready' | 'error' | 'guest';

interface PlayerProfileContextValue {
  status: PlayerProfileStatus;
  profile: PlayerProfile | null;
  // Default to 0 (not nullable) so the ~20 screens showing a CurrencyPill
  // next to this don't each need their own loading/guest fallback logic --
  // 0 is already the correct, honest value for a guest or a not-yet-loaded
  // real balance.
  chips: number;
  gems: number;
  // Re-fetches from the server -- called after anything that changes the
  // real balance (a match reward claim) or the signed-in identity itself
  // (sign-up, sign-in, logout), since this context is only fetched once on
  // mount otherwise.
  refresh: () => Promise<void>;
}

const PlayerProfileContext = createContext<PlayerProfileContextValue | null>(null);

// Mounted once at the app root (_layout.tsx) -- every screen that shows the
// player's chips/gems balance reads it from here instead of duplicating its
// own getAuthToken()/getMyProfile() fetch (the pattern iron-id.tsx and
// world-rankings.tsx each used to do independently before this existed).
export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PlayerProfileStatus>('loading');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  const refresh = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setStatus('guest');
      setProfile(null);
      return;
    }
    setStatus('loading');
    try {
      const { profile: fetched } = await getMyProfile(token);
      setProfile(fetched);
      setStatus('ready');
    } catch (error) {
      console.log('Failed to load player profile', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<PlayerProfileContextValue>(
    () => ({
      status,
      profile,
      chips: profile?.chips ?? 0,
      gems: profile?.gems ?? 0,
      refresh,
    }),
    [status, profile, refresh],
  );

  return <PlayerProfileContext.Provider value={value}>{children}</PlayerProfileContext.Provider>;
}

export function usePlayerProfile(): PlayerProfileContextValue {
  const context = useContext(PlayerProfileContext);
  if (!context) {
    throw new Error('usePlayerProfile must be used within a PlayerProfileProvider');
  }
  return context;
}
