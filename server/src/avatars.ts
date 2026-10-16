import { PREMIUM_AVATARS, type PremiumAvatarEntry } from './avatarCatalog.generated.js';

export { PREMIUM_AVATARS };
export type { PremiumAvatarEntry };

// Mirrors src/constants/avatars.ts on the client. Three classes:
//   garage_band  -- the 12 original badges, free and implicit (never rows in
//                   cosmetic_items; existing accounts already point at them
//                   with no user_cosmetics rows, so they must stay equippable).
//   main_stage / hall_of_fame -- premium: seeded as category 'avatar' in
//                   cosmetic_items, owned via user_cosmetics, bought through
//                   POST /me/cosmetics/:itemId/unlock. Prices, rarity and rating
//                   gates live in scripts/gen-avatar-catalog.mjs (generates
//                   avatarCatalog.generated.ts here and the client mirror).
// Never persist a rename: `id` is stored as player_profiles.avatarId.
// TEMPORARY master switch: while true, every catalog avatar can be equipped by
// anyone without owning it (premium rules in db/cosmetics.ts and the
// ownership check in PATCH /me/profile are bypassed for avatars). Flip to false
// (and the client's matching constant in src/constants/avatars.ts) to restore
// the Main Stage / Hall of Fame paywall -- nothing else needs to change.
export const UNLOCK_ALL_AVATARS = true;

export const FREE_AVATAR_IDS: ReadonlySet<string> = new Set([
  'axe', 'nova', 'riff', 'axl', 'blaze', 'beats', 'mic-drop', 'synth', 'reaper', 'king', 'rebel', 'legend',
]);

const PREMIUM_BY_ID: ReadonlyMap<string, PremiumAvatarEntry> = new Map(PREMIUM_AVATARS.map((a) => [a.id, a]));

export function getPremiumAvatar(id: string): PremiumAvatarEntry | undefined {
  return PREMIUM_BY_ID.get(id);
}
