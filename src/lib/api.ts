const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `request failed (${response.status})`);
  }
  return data;
}

// Signup/login now go through authClient.ts (better-auth) instead of this
// plain fetch wrapper -- everything below is still a regular REST call
// guarded by the bearer token that produces, validated server-side via
// auth.api.getSession instead of jwt.verify.

export function updateProfile(
  token: string,
  updates: { displayName?: string; avatarId?: string; equippedBoardId?: string; equippedPieceId?: string },
): Promise<{ ok: true }> {
  return request('/me/profile', { method: 'PATCH', body: updates, token });
}

// Maps account-security.tsx's "Delete Account" button.
export function deleteAccount(token: string): Promise<{ ok: true }> {
  return request('/me', { method: 'DELETE', token });
}

// Spend gems or chips (caller's choice) to own a locked cosmetic (currently
// only board themes). Rejects with Error('insufficient-funds') or
// Error('already-owned') -- callers catch those specifically.
export function unlockCosmetic(
  token: string,
  itemId: string,
  currency: 'gems' | 'chips',
): Promise<{ ok: true; itemId: string; currency: 'gems' | 'chips'; price: number; gems: number; chips: number }> {
  return request(`/me/cosmetics/${encodeURIComponent(itemId)}/unlock`, {
    method: 'POST',
    body: { currency },
    token,
  });
}

export interface PlayerProfile {
  userId: string;
  displayName: string | null;
  avatarId: string | null;
  level: number;
  xp: number;
  rating: number;
  winStreak: number;
  wins: number;
  losses: number;
  draws: number;
  chips: number;
  gems: number;
  country: string | null;
  equippedBoardId: string | null;
  equippedPieceId: string | null;
  equippedAvatarCosmeticId: string | null;
  ownedCosmeticIds: string[];
}

export function getMyProfile(token: string): Promise<{ profile: PlayerProfile }> {
  return request('/me/profile', { method: 'GET', token });
}

// Bot/local matches never reach the server otherwise (pure client-side
// chess.js) -- this is the one point a reward gets persisted for those
// modes. Online matches are credited authoritatively server-side instead
// (see persistMatchResult.ts), so this is never called for mode: 'online'.
export function claimMatchReward(
  token: string,
  outcome: 'win' | 'loss' | 'draw',
): Promise<{ ok: true; chipsGranted: number; chips: number; xpGranted: number; xp: number; level: number }> {
  return request('/me/match-reward', { method: 'POST', body: { outcome }, token });
}

export interface DailyBonusStatus {
  currentStreak: number;
  canClaimToday: boolean;
  nextClaimDay: number; // 1-7
}

export function getDailyBonusStatus(token: string): Promise<DailyBonusStatus> {
  return request('/me/daily-bonus/status', { method: 'GET', token });
}

export interface DailyBonusClaimResult {
  ok: true;
  day: number;
  streak: number;
  chipsGranted: number;
  gemsGranted: number;
  chips: number;
  gems: number;
}

// Rejects with Error('already-claimed-today') on a same-UTC-day repeat call
// (the request() helper throws data.error on non-2xx) -- callers catch that
// specifically to show a "come back tomorrow" state instead of a generic error.
export function claimDailyBonus(token: string): Promise<DailyBonusClaimResult> {
  return request('/me/daily-bonus/claim', { method: 'POST', token });
}

export interface SpinStatus {
  canSpin: boolean;
}

export function getSpinStatus(token: string): Promise<SpinStatus> {
  return request('/me/spin/status', { method: 'GET', token });
}

export interface SpinResult {
  ok: true;
  prizeId: string;
  label: string;
  rewardType: 'chips' | 'gems' | 'xp';
  rewardAmount: number;
  chips: number;
  gems: number;
}

// The server picks the prize before responding (see server/src/db/spin.ts) --
// the client only animates the wheel to whichever prizeId comes back, it
// never decides the outcome itself. Rejects with Error('already-spun-today')
// on a same-UTC-day repeat call.
export function spinWheel(token: string): Promise<SpinResult> {
  return request('/me/spin', { method: 'POST', token });
}

export interface MatchHistoryEntry {
  matchId: string;
  playedAt: string;
  mode: 'bot' | 'local' | 'online';
  resultType: 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'forfeit';
  color: 'w' | 'b';
  outcome: 'win' | 'loss' | 'draw';
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  opponentDisplayName: string;
}

export function getMyMatches(token: string, limit?: number): Promise<{ matches: MatchHistoryEntry[] }> {
  const query = limit ? `?limit=${limit}` : '';
  return request(`/me/matches${query}`, { method: 'GET', token });
}

// Backs the replay screen. pgn/moveElapsedMs are both null when the match
// predates this feature or was never persisted with move data (e.g. a
// bot/local mode row, if one ever exists) -- callers show an empty state
// rather than assuming every match history row is replayable.
export function getMatchReplay(
  token: string,
  matchId: string,
): Promise<{ pgn: string | null; moveElapsedMs: number[] | null }> {
  return request(`/me/matches/${encodeURIComponent(matchId)}/replay`, { method: 'GET', token });
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  avatarId: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

// Public endpoint -- no token needed.
export function getLeaderboard(limit?: number): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const query = limit ? `?limit=${limit}` : '';
  return request(`/leaderboard${query}`, { method: 'GET' });
}

// Deliberately just rank + total -- every other field the "YOU" card needs
// (rating, displayName, avatarId, wins/losses/draws) already comes from
// getMyProfile, so callers combine both rather than this duplicating them.
export function getMyRank(token: string): Promise<{ rank: number; totalPlayers: number }> {
  return request('/leaderboard/me', { method: 'GET', token });
}
