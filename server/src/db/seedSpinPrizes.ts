import '../env.js';

import { SPIN_PRIZE_SEED } from '../spinPrizes.js';
import { db } from './client.js';
import { spinPrizes } from './schema/index.js';

// Standalone, idempotent (upsert, not insert-only) -- safe to re-run if the
// seed table's numbers get tuned later. Not run automatically on server
// boot: this codebase already documents `drizzle-kit migrate` as a manual
// one-time deploy step (see server/README.md), and boot-time seeding would
// silently overwrite any live-tuned prize weights on every deploy.
async function main() {
  for (const prize of SPIN_PRIZE_SEED) {
    await db
      .insert(spinPrizes)
      .values(prize)
      .onConflictDoUpdate({
        target: spinPrizes.id,
        set: {
          label: prize.label,
          rewardType: prize.rewardType,
          rewardAmount: prize.rewardAmount,
          weight: prize.weight,
        },
      });
  }
  console.log(`Seeded ${SPIN_PRIZE_SEED.length} spin prizes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
