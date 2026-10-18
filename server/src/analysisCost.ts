import { ECONOMY } from './economy.generated.js';

// Mirrored read-only client-side in src/lib/analysisCost.ts (same pattern as
// matchRewards.ts); both read economy.config.json. One review costs about one
// online win (200 chips) or 5 gems -- the same 40:1 chip-to-gem rate as every
// other price -- so analysing a game is a real decision, not pocket change.
export const ANALYSIS_COST = { ...ECONOMY.analysis } as const;
