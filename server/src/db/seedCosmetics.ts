import '../env.js';

import { BOARD_THEMES } from '../boardThemes.js';
import { db } from './client.js';
import { cosmeticItems } from './schema/index.js';

// Standalone, idempotent (upsert, not insert-only) -- safe to re-run if
// name/prices get tuned later. Not run automatically on server boot, same
// reasoning as seedSpinPrizes.ts. Seeds all 5 board themes (including the
// 3 free ones) for catalog completeness, not just the 2 priced ones --
// mirrors cosmeticItems' own "seed once" comment in schema/economy.ts.
//
// Chip price has no dedicated column (cosmeticItems only has gemPrice) --
// stored in the existing unused `metadata` jsonb column instead of adding a
// migration for a single extra int. See the board-theme-purchases plan doc
// for why.
async function main() {
  for (const theme of BOARD_THEMES) {
    const row = {
      id: theme.id,
      category: 'board' as const,
      name: theme.name,
      gemPrice: theme.gemPrice,
      metadata: { chipPrice: theme.chipPrice },
    };
    await db
      .insert(cosmeticItems)
      .values(row)
      .onConflictDoUpdate({
        target: cosmeticItems.id,
        set: { category: row.category, name: row.name, gemPrice: row.gemPrice, metadata: row.metadata },
      });
  }
  console.log(`Seeded ${BOARD_THEMES.length} cosmetic items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
