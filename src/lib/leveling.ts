// Mirrors server/src/leveling.ts's curve read-only (xpForLevel/levelForXp/
// getLevelProgress only -- applyXpGain is a server-only mutation helper,
// not duplicated here). Pure stateless math with no trust implication, so
// duplicating it client-side for display (rather than growing the
// GET /me/profile response contract) is safe -- same precedent as
// src/lib/matchRewards.ts mirroring the server's chip amounts. Keep both
// files in sync if the curve changes.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 300 * level * level;
}

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = Math.max(1, Math.floor(Math.sqrt(xp / 300)));
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const span = xpForLevel(level + 1) - floor;
  const xpIntoLevel = Math.max(0, xp - floor);
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: span,
    progress: span > 0 ? Math.min(1, xpIntoLevel / span) : 1,
  };
}
