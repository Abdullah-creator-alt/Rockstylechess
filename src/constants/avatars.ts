import type { ImageSourcePropType } from 'react-native';

import { PREMIUM_AVATAR_ASSETS } from './avatarImages.generated';
import { Colors } from './theme';

// Single source of truth for every selectable player avatar in the game.
// Both (auth)/pick-rockstar.tsx (onboarding picker) and (shop)/forge.tsx
// (shop/equip screen) render this same list, so a new avatar only needs to
// be added here once to show up consistently everywhere. `id` is also the
// value persisted as `avatarId` on the player's profile (see
// server/src/db/schema/users.ts), so it must stay unique and stable --
// never change an existing avatar's id once shipped.
//
// Avatars come in three collectible CLASSES (a career: garage -> main stage ->
// hall of fame). Each class has its own art style, ring frame (PlayerAvatar)
// and price tier, and the picker never mixes classes in one grid:
//   garage_band  -- the 12 original neon rock badges, sliced from
//                   assets/avatar/avatar_rock_12pcs_set.png by
//                   scripts/split-avatars.mjs. Free, owned by everyone.
//   main_stage   -- 41 painted avatars. Premium: gems or chips.
//   hall_of_fame -- 24 photoreal-neon avatars. Premium: gems only AND a rating
//                   gate (must have reached `minRating` to be allowed to buy).
// The premium rows (rarity, prices, gates) are GENERATED into
// avatarImages.generated.ts by scripts/gen-avatar-catalog.mjs, which also
// generates the authoritative server mirror (server/src/avatarCatalog.generated.ts).
// Edit prices/bands in the script, never here; the server enforces them.
// TEMPORARY master switch (mirrors UNLOCK_ALL_AVATARS in server/src/avatars.ts --
// flip BOTH): while true every avatar counts as owned/unlocked, in every picker.
// Set to false to restore the Main Stage / Hall of Fame paywall.
export const UNLOCK_ALL_AVATARS = true;

export type AvatarClass = 'garage_band' | 'main_stage' | 'hall_of_fame';
export type AvatarRarity = 'common' | 'rare' | 'legendary' | 'gold' | 'platinum' | 'immortal';

export interface AvatarClassInfo {
  id: AvatarClass;
  label: string;
  tagline: string;
  /** Tab / header / frame accent. */
  accent: string;
}

export const AVATAR_CLASSES: readonly AvatarClassInfo[] = [
  { id: 'garage_band', label: 'GARAGE BAND', tagline: 'Where every band starts. Free for all.', accent: Colors.chromeMid },
  { id: 'main_stage', label: 'MAIN STAGE', tagline: 'Painted legends of the live circuit.', accent: Colors.neon },
  { id: 'hall_of_fame', label: 'HALL OF FAME', tagline: 'Rare. Earned by rating, bought with gems.', accent: Colors.gold },
];

export interface AvatarOption {
  id: string;
  name: string;
  image: ImageSourcePropType;
  class: AvatarClass;
  rarity: AvatarRarity | null;
  /** Derived: every non-Garage-Band avatar must be owned before it can be equipped. */
  locked: boolean;
  gemPrice?: number;
  /** null/undefined = gems only (Hall of Fame). */
  chipPrice?: number | null;
  /** Rating the player must have reached to be allowed to buy it. */
  minRating?: number | null;
}

const GARAGE: Omit<AvatarOption, 'class' | 'rarity' | 'locked'>[] = [
  { id: 'axe', name: 'AXE', image: require('../../assets/avatar/axe.png') },
  { id: 'nova', name: 'NOVA', image: require('../../assets/avatar/nova.png') },
  { id: 'riff', name: 'RIFF', image: require('../../assets/avatar/riff.png') },
  { id: 'axl', name: 'AXL', image: require('../../assets/avatar/axl.png') },
  { id: 'blaze', name: 'BLAZE', image: require('../../assets/avatar/blaze.png') },
  { id: 'beats', name: 'BEATS', image: require('../../assets/avatar/beats.png') },
  { id: 'mic-drop', name: 'MIC DROP', image: require('../../assets/avatar/mic-drop.png') },
  { id: 'synth', name: 'SYNTH', image: require('../../assets/avatar/synth.png') },
  { id: 'reaper', name: 'REAPER', image: require('../../assets/avatar/reaper.png') },
  { id: 'king', name: 'KING', image: require('../../assets/avatar/king.png') },
  { id: 'rebel', name: 'REBEL', image: require('../../assets/avatar/rebel.png') },
  // Not "king-axl" -- that id/name is already the strongest bot in
  // (play)/bots.tsx ("King Axl", stockfish-strong); reusing it for a
  // selectable avatar would be confusing, so this is a distinct character.
  { id: 'legend', name: 'LEGEND', image: require('../../assets/avatar/legend.png') },
];

export const AVATARS: AvatarOption[] = [
  ...GARAGE.map((a): AvatarOption => ({ ...a, class: 'garage_band', rarity: null, locked: false })),
  ...PREMIUM_AVATAR_ASSETS.map(
    (a): AvatarOption => ({ ...a, name: a.name.toUpperCase(), locked: !UNLOCK_ALL_AVATARS }),
  ),
];

export function getAvatarsByClass(avatarClass: AvatarClass): AvatarOption[] {
  return AVATARS.filter((a) => a.class === avatarClass);
}

const AVATAR_BY_ID: Record<string, AvatarOption> = AVATARS.reduce(
  (map, avatar) => ({ ...map, [avatar.id]: avatar }),
  {} as Record<string, AvatarOption>,
);

/**
 * Whether `avatarId` can be equipped by a player holding `ownedCosmeticIds`
 * (GET /me/profile). Garage Band is free; premium ones need a user_cosmetics row.
 * Mirrors the server's PATCH /me/profile check, which is the real enforcement.
 */
export function isAvatarOwned(avatarId: string, ownedCosmeticIds: readonly string[] | undefined): boolean {
  const avatar = AVATAR_BY_ID[avatarId];
  if (!avatar) return false;
  if (!avatar.locked) return true;
  return ownedCosmeticIds?.includes(avatarId) ?? false;
}

/** Class of an avatar id; unknown/missing ids render as Garage Band (like the image fallback). */
export function getAvatarClass(avatarId: string | null | undefined): AvatarClass {
  return (avatarId ? AVATAR_BY_ID[avatarId]?.class : undefined) ?? 'garage_band';
}

export function getAvatarOption(avatarId: string | null | undefined): AvatarOption | undefined {
  return avatarId ? AVATAR_BY_ID[avatarId] : undefined;
}

// Shown for accounts with no avatarId set yet -- true for every account
// created before pick-rockstar's avatar step existed. 'riff' is the rock
// hand, i.e. the old '🤘' default this replaced.
export const DEFAULT_AVATAR_IMAGE: ImageSourcePropType = require('../../assets/avatar/riff.png');

export function getAvatarImage(avatarId: string | null | undefined): ImageSourcePropType {
  if (!avatarId) return DEFAULT_AVATAR_IMAGE;
  return AVATAR_BY_ID[avatarId]?.image ?? DEFAULT_AVATAR_IMAGE;
}
