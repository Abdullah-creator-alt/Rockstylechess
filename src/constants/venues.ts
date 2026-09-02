import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { VenueTier } from '@/lib/onlineMatch';

import { ScreenArt } from './screenArt';

// The single venue/stakes ladder, shared by the Home lobby's venue picker
// ((tabs)/home.tsx) and Match Setup ((play)/setup.tsx). Both render this same
// list and forward the selected `id` to /matchmaking as `venueTier`, so a
// venue only needs to be added / re-priced here once.
//
// `buyIn`/`prize` are in chips (post the 1000x economy rescale). A venue is
// "locked" purely by affordability -- `buyIn > player's chips` -- there is no
// separate unlock flag.
export interface Venue {
  /** Also the `venueTier` forwarded to /matchmaking -- kept in lockstep with onlineMatch.ts. */
  id: VenueTier;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  buyIn: number;
  prize: number;
  /** Atmospheric photo behind the venue-detail hero card (a require()'d asset). */
  image: number;
}

// Every venue has dedicated art except Mainstage, which reuses the Arena
// photo until dedicated art exists.
export const VENUES: Venue[] = [
  { id: 'garage', name: 'The Garage', icon: 'garage', buyIn: 0, prize: 0, image: ScreenArt.venueGarage },
  { id: 'club', name: 'The Club', icon: 'glass-cocktail', buyIn: 10, prize: 20, image: ScreenArt.venueClub },
  { id: 'arena', name: 'The Arena', icon: 'stadium-variant', buyIn: 250, prize: 500, image: ScreenArt.venueArena },
  { id: 'stadium', name: 'The Stadium', icon: 'castle', buyIn: 2_000, prize: 4_000, image: ScreenArt.venueStadium },
  { id: 'mainstage', name: 'Mainstage', icon: 'guitar-electric', buyIn: 25_000, prize: 50_000, image: ScreenArt.venueArena },
  { id: 'world-tour', name: 'World Tour', icon: 'earth', buyIn: 100_000, prize: 200_000, image: ScreenArt.venueWorldTour },
];

export function getVenue(id: string | null | undefined): Venue {
  return VENUES.find((v) => v.id === (id as VenueTier)) ?? VENUES[2]; // default: The Arena
}

// Temporary: every venue is selectable regardless of the player's balance.
// Set to false to re-gate the higher tiers behind `venue.buyIn <= chips`.
export const UNLOCK_ALL_VENUES = true;

export function isVenueLocked(venue: Venue, chips: number): boolean {
  return !UNLOCK_ALL_VENUES && venue.buyIn > chips;
}

/** Compact chip amount for a stakes label: `FREE` / `250` / `2K` / `100K` / `1.5M`. */
export function formatChips(value: number): string {
  if (value === 0) return 'FREE';
  if (value >= 1_000_000) return `${value % 1_000_000 === 0 ? value / 1_000_000 : (value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${value % 1_000 === 0 ? value / 1_000 : (value / 1_000).toFixed(1)}K`;
  return `${value}`;
}
