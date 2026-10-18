import { COSMETIC_PRICES } from './economy.generated.js';

export interface PieceSetCatalogEntry {
  id: string;
  name: string;
  locked: boolean;
  gemPrice: number; // 0 for free entries
  chipPrice: number; // 0 for free entries
}

// Mirrors src/constants/pieceSets.ts on the client -- see
// server/src/boardThemes.ts's header comment for the full reasoning
// (authoritative for equip validation, the cosmetics seed script, and
// purchase pricing; never carries color/accent data). Prices come from the
// shared tier ladder in economy.config.json via COSMETIC_PRICES.
function entry(id: string, name: string, locked: boolean): PieceSetCatalogEntry {
  const price = COSMETIC_PRICES[id];
  return { id, name, locked, gemPrice: price.gems, chipPrice: price.chips ?? 0 };
}

export const PIECE_SETS: PieceSetCatalogEntry[] = [
  // Id isn't 'classic-chrome' -- that's already BOARD_THEMES' free tier id,
  // and cosmeticItems.id is one global primary key across categories.
  entry('classic-pieces', 'Classic Chrome', false),
  entry('graphite-tour', 'Graphite Tour', true),
  entry('molten-gold', 'Molten Gold', true),
  entry('crimson-reaper', 'Crimson Reaper', true),
];
