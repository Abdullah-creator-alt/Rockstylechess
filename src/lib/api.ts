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

export interface AuthResponse {
  token: string;
}

export function signup(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/signup', { method: 'POST', body: { email, password } });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export function updateProfile(
  token: string,
  updates: { displayName?: string; avatarId?: string },
): Promise<{ ok: true }> {
  return request('/me/profile', { method: 'PATCH', body: updates, token });
}

// Maps account-security.tsx's "Delete Account" button.
export function deleteAccount(token: string): Promise<{ ok: true }> {
  return request('/me', { method: 'DELETE', token });
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
}

export function getMyProfile(token: string): Promise<{ profile: PlayerProfile }> {
  return request('/me/profile', { method: 'GET', token });
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
