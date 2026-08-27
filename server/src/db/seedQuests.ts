import '../env.js';

import { QUEST_SEED } from '../questCatalog.js';
import { db } from './client.js';
import { quests } from './schema/index.js';

// Standalone, idempotent (upsert, not insert-only) -- safe to re-run if the
// seed catalog's numbers get tuned later. Not run automatically on server
// boot -- mirrors seedSpinPrizes.ts's reasoning exactly (see its comment).
async function main() {
  for (const quest of QUEST_SEED) {
    await db
      .insert(quests)
      .values(quest)
      .onConflictDoUpdate({
        target: quests.id,
        set: {
          type: quest.type,
          title: quest.title,
          description: quest.description,
          icon: quest.icon,
          target: quest.target,
          rewardChips: quest.rewardChips,
          minLevel: quest.minLevel,
          metric: quest.metric,
        },
      });
  }
  console.log(`Seeded ${QUEST_SEED.length} quests.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
