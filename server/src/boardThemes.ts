import { COSMETIC_PRICES } from './economy.generated.js';

export interface BoardThemeCatalogEntry {
  id: string;
  name: string;
  locked: boolean;
  gemPrice: number; // 0 for free entries
  chipPrice: number; // 0 for free entries
}

// Mirrors src/constants/boardThemes.ts on the client. Authoritative catalog
// for equip validation (PATCH /me/profile), the cosmetics seed script
// (seedCosmetics.ts), and the purchase route's pricing -- never renders
// colors, so it doesn't need the squares/glowColor fields the client has.
//
// Only classic-chrome is free/unlocked by default. Prices are NOT written
// here: each board sits on a tier of the one shared ladder in
// economy.config.json (1 gem = 40 chips everywhere) and is looked up from
// COSMETIC_PRICES, so re-pricing the game never means editing this file.
function entry(id: string, name: string, locked: boolean): BoardThemeCatalogEntry {
  const price = COSMETIC_PRICES[id];
  return { id, name, locked, gemPrice: price.gems, chipPrice: price.chips ?? 0 };
}

export const BOARD_THEMES: BoardThemeCatalogEntry[] = [
  entry('classic-chrome', 'Classic Chrome', false),
  entry('cyan-storm', 'Cyan Storm', true),
  entry('gold-rush', 'Gold Rush', true),
  entry('crimson-stage', 'Crimson Stage', true),
  entry('obsidian-void', 'Obsidian Void', true),
];
