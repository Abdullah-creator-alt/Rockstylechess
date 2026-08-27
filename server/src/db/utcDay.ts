// Shared by dailyBonus.ts, spin.ts, and quests.ts -- all three reset on a
// UTC-calendar-day cadence. Deliberately not user-local-timezone-aware; a
// mobile game's daily resets don't need compliance-grade precision.
export function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function utcDayDiff(from: Date, to: Date): number {
  return Math.round((utcDayStart(to).getTime() - utcDayStart(from).getTime()) / 86_400_000);
}
