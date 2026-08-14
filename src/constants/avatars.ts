// Maps the avatarId a player picked in (auth)/pick-rockstar.tsx (persisted
// via PATCH /me/profile) back to a displayable emoji, for any screen that
// renders another player's avatar from raw API data (world-rankings.tsx,
// iron-id.tsx) rather than driving a live selection UI. pick-rockstar.tsx
// itself is the source of truth for the full catalog (it also needs
// name/locked/price, which this doesn't) -- kept in sync manually since
// there are only a handful of entries.
const AVATAR_EMOJI: Record<string, string> = {
  axe: '🎸',
  nova: '⚡',
  riff: '🤘',
  reaper: '💀',
  king: '👑',
};

// Matches the generic avatar already used in headers elsewhere (e.g.
// world-rankings.tsx's own header icon) for accounts with no avatarId set
// yet -- true for every account today, since none have completed
// pick-rockstar's avatar-selection step.
export const DEFAULT_AVATAR_EMOJI = '🤘';

export function getAvatarEmoji(avatarId: string | null | undefined): string {
  if (!avatarId) return DEFAULT_AVATAR_EMOJI;
  return AVATAR_EMOJI[avatarId] ?? DEFAULT_AVATAR_EMOJI;
}
