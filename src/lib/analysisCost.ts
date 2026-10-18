import { ECONOMY } from '@/lib/economy.generated';

// Read-only mirror of server/src/analysisCost.ts -- both read
// economy.config.json. Used to render the confirm-and-charge prompt without a
// network round trip; the server's own copy is what actually gets charged.
export const ANALYSIS_COST = { ...ECONOMY.analysis } as const;
