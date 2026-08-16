export interface BoardThemeCatalogEntry {
  id: string;
  locked: boolean;
}

// Mirrors src/constants/boardThemes.ts on the client. Only id/locked are
// needed here -- the server validates equippedBoardId against a known,
// unlocked id and never renders colors. Keep in sync if themes are
// added/removed/re-priced.
export const BOARD_THEMES: BoardThemeCatalogEntry[] = [
  { id: 'classic-chrome', locked: false },
  { id: 'crimson-stage', locked: false },
  { id: 'cyan-storm', locked: false },
  { id: 'gold-rush', locked: true },
  { id: 'obsidian-void', locked: true },
];
