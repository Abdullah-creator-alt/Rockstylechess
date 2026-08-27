// Single source of truth for every selectable player avatar in the game.
// Both (auth)/pick-rockstar.tsx (onboarding picker) and (shop)/forge.tsx
// (shop/equip screen) render this same list, so a new avatar only needs to
// be added here once to show up consistently everywhere. `id` is also the
// value persisted as `avatarId` on the player's profile (see
// server/src/db/schema/users.ts), so it must stay unique and stable --
// never change an existing avatar's id once shipped.
export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  locked: boolean;
  gemPrice?: number;
}

export const AVATARS: AvatarOption[] = [
  { id: 'axe', name: 'AXE', emoji: '🎸', locked: false },
  { id: 'nova', name: 'NOVA', emoji: '⚡', locked: false },
  { id: 'riff', name: 'RIFF', emoji: '🤘', locked: false },
  { id: 'axl', name: 'AXL', emoji: '🕶️', locked: false },
  { id: 'blaze', name: 'BLAZE', emoji: '🔥', locked: false },
  { id: 'beats', name: 'BEATS', emoji: '🥁', locked: false },
  { id: 'mic-drop', name: 'MIC DROP', emoji: '🎤', locked: false },
  { id: 'synth', name: 'SYNTH', emoji: '🎹', locked: false },
  { id: 'reaper', name: 'REAPER', emoji: '💀', locked: false },
  { id: 'king', name: 'KING', emoji: '👑', locked: false },
  { id: 'rebel', name: 'REBEL', emoji: '⛓️', locked: false },
  // Not "king-axl" -- that id/name is already the strongest bot in
  // (play)/bots.tsx ("King Axl", 👑, stockfish-strong); reusing it for a
  // selectable avatar would be confusing, so this is a distinct character.
  { id: 'legend', name: 'LEGEND', emoji: '🏆', locked: false },
];

const AVATAR_EMOJI: Record<string, string> = AVATARS.reduce(
  (map, avatar) => ({ ...map, [avatar.id]: avatar.emoji }),
  {} as Record<string, string>,
);

// Matches the generic avatar already used in headers elsewhere (e.g.
// world-rankings.tsx's own header icon) for accounts with no avatarId set
// yet -- true for every account today, since none have completed
// pick-rockstar's avatar-selection step.
export const DEFAULT_AVATAR_EMOJI = '🤘';

export function getAvatarEmoji(avatarId: string | null | undefined): string {
  if (!avatarId) return DEFAULT_AVATAR_EMOJI;
  return AVATAR_EMOJI[avatarId] ?? DEFAULT_AVATAR_EMOJI;
}
