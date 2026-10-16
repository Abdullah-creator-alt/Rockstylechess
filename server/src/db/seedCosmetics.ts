import '../env.js';

import { PREMIUM_AVATARS } from '../avatars.js';
import { BOARD_THEMES } from '../boardThemes.js';
import { PIECE_SETS } from '../pieceSets.js';
import { db } from './client.js';
import { cosmeticItems } from './schema/index.js';

// Standalone, idempotent (upsert, not insert-only) -- safe to re-run if
// name/prices get tuned later. Not run automatically on server boot, same
// reasoning as seedSpinPrizes.ts. Seeds every board theme and piece set
// (including the free ones) for catalog completeness, not just the priced
// ones -- mirrors cosmeticItems' own "seed once" comment in schema/economy.ts.
//
// Chip price has no dedicated column (cosmeticItems only has gemPrice) --
// stored in the existing unused `metadata` jsonb column instead of adding a
// migration for a single extra int. See the board-theme-purchases plan doc
// for why.
async function main() {
  // Premium avatars only -- the 12 free Garage Band badges stay implicit (see
  // avatars.ts). Hall of Fame has no chip price (gems only) and a rating gate;
  // both ride along in metadata, which purchaseCosmetic reads.
  const catalog = [
    ...BOARD_THEMES.map((theme) => ({
      ...theme,
      category: 'board' as const,
      metadata: { chipPrice: theme.chipPrice } as Record<string, unknown>,
    })),
    ...PIECE_SETS.map((set) => ({
      ...set,
      category: 'piece' as const,
      metadata: { chipPrice: set.chipPrice } as Record<string, unknown>,
    })),
    ...PREMIUM_AVATARS.map((avatar) => ({
      ...avatar,
      category: 'avatar' as const,
      metadata: {
        chipPrice: avatar.chipPrice,
        class: avatar.class,
        rarity: avatar.rarity,
        minRating: avatar.minRating,
      } as Record<string, unknown>,
    })),
  ];
  const ids = new Set<string>();
  for (const entry of catalog) {
    if (ids.has(entry.id)) throw new Error(`Duplicate cosmetic id in catalog: ${entry.id}`);
    ids.add(entry.id);
  }
  for (const entry of catalog) {
    const row = {
      id: entry.id,
      category: entry.category,
      name: entry.name,
      gemPrice: entry.gemPrice,
      metadata: entry.metadata,
    };
    await db
      .insert(cosmeticItems)
      .values(row)
      .onConflictDoUpdate({
        target: cosmeticItems.id,
        set: { category: row.category, name: row.name, gemPrice: row.gemPrice, metadata: row.metadata },
      });
  }
  console.log(`Seeded ${catalog.length} cosmetic items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
