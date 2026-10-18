import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ECONOMY } from '@/lib/economy.generated';
import type { VenueTier } from '@/lib/onlineMatch';

import { ScreenArt } from './screenArt';
import { Colors } from './theme';

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
  /** What the winner receives (pot minus the 10% house cut). */
  prize: number;
  /** Minimum rating to enter (0 = anyone). Enforced by the server. */
  minRating: number;
  /** Atmospheric photo behind the venue-detail hero card (a require()'d asset). */
  image: number;
  /**
   * Match-HUD/backdrop accent for this venue (VenueBackdrop's color wash +
   * in-match HUD chrome tint). Independent of ChessBoardTheme.glowColor
   * (the player's equipped Forge board skin, see boardThemes.ts) -- never
   * conflate the two. This never reaches ChessBoard's `theme`/`pieceSprites`
   * props; the board itself is venue-agnostic by design.
   */
  accentColor: string;
}

// buyIn / prize / minRating come from economy.config.json (prize = 1.8x buy-in: the
// winner's share of the pot after a 10% house cut). Online matches at a venue with a
// buy-in are REAL wagers, enforced server-side (server/src/db/wagers.ts); Garage is free.
//
// Every venue has dedicated art (assets/images/, keyed via ScreenArt).
// accentColor is hand-picked per venue (same approach as boardThemes.ts's
// stone accents) -- deliberately escalating from flat/utilitarian (Garage)
// to rich/premiere (World Tour); see getVenueIntensity for how *much* of it
// shows, which scales off tier position rather than being hand-tuned here.
export const VENUES: Venue[] = [
  { id: 'garage', name: 'The Garage', icon: 'garage', buyIn: ECONOMY.venues['garage'].buyIn, prize: ECONOMY.venues['garage'].prize, minRating: ECONOMY.venues['garage'].minRating, image: ScreenArt.venueGarage, accentColor: Colors.chromeMid },
  { id: 'club', name: 'The Club', icon: 'glass-cocktail', buyIn: ECONOMY.venues['club'].buyIn, prize: ECONOMY.venues['club'].prize, minRating: ECONOMY.venues['club'].minRating, image: ScreenArt.venueClub, accentColor: '#C13FE0' },
  { id: 'arena', name: 'The Arena', icon: 'stadium-variant', buyIn: ECONOMY.venues['arena'].buyIn, prize: ECONOMY.venues['arena'].prize, minRating: ECONOMY.venues['arena'].minRating, image: ScreenArt.venueArena, accentColor: Colors.ember },
  { id: 'stadium', name: 'The Stadium', icon: 'castle', buyIn: ECONOMY.venues['stadium'].buyIn, prize: ECONOMY.venues['stadium'].prize, minRating: ECONOMY.venues['stadium'].minRating, image: ScreenArt.venueStadium, accentColor: '#3E7BD6' },
  { id: 'mainstage', name: 'Mainstage', icon: 'guitar-electric', buyIn: ECONOMY.venues['mainstage'].buyIn, prize: ECONOMY.venues['mainstage'].prize, minRating: ECONOMY.venues['mainstage'].minRating, image: ScreenArt.venueMainstage, accentColor: Colors.gold },
  { id: 'world-tour', name: 'World Tour', icon: 'earth', buyIn: ECONOMY.venues['world-tour'].buyIn, prize: ECONOMY.venues['world-tour'].prize, minRating: ECONOMY.venues['world-tour'].minRating, image: ScreenArt.venueWorldTour, accentColor: '#8B3FE0' },
];

export function getVenue(id: string | null | undefined): Venue {
  return VENUES.find((v) => v.id === (id as VenueTier)) ?? VENUES[2]; // default: The Arena
}

/** This venue's position on the ladder: 0 = Garage, VENUES.length - 1 = World Tour. */
export function getVenueTierIndex(id: string | null | undefined): number {
  const idx = VENUES.findIndex((v) => v.id === (id as VenueTier));
  return idx === -1 ? 0 : idx;
}

export interface VenueIntensity {
  /** Opacity of the venue photo behind the match/results screen. */
  backdropOpacity: number;
  /** Strength of VenueBackdrop's top-of-screen scrim toward bgBase. */
  scrimTop: number;
  /** Alpha for venue-accented HUD borders/glow. */
  glowOpacity: number;
  /** Blur radius for venue-accented HUD glow (boxShadow). */
  glowRadius: number;
  /** Whether the backdrop's animated light-sweep layer is enabled. */
  shimmer: boolean;
}

/**
 * How much venue atmosphere shows, scaled by ladder position -- Garage
 * reads as deliberately minimal/plain, World Tour as the most elaborate.
 * *Which* color/photo shows is hand-authored per venue above; this only
 * controls *how much*, so intensity scales as one formula instead of six
 * separately hand-tuned blocks.
 */
export function getVenueIntensity(id: string | null | undefined): VenueIntensity {
  const t = VENUES.length > 1 ? getVenueTierIndex(id) / (VENUES.length - 1) : 0;
  return {
    backdropOpacity: 0.12 + t * 0.28,
    scrimTop: 0.7 - t * 0.15,
    glowOpacity: 0.15 + t * 0.35,
    glowRadius: 6 + t * 18,
    shimmer: t >= 0.8,
  };
}

export type VenueRequirement = 'sign-in' | 'rating' | 'chips';

export interface VenueEntryContext {
  /** 'loading' is treated as "don't lock yet" -- the server is the real gate. */
  status: 'loading' | 'ready' | 'error' | 'guest';
  chips: number;
  rating: number;
}

/**
 * Why this player cannot enter this venue right now, or null if they can.
 * Mirrors the server's queue:join checks (guests and a short balance / low rating
 * are refused there too) so the UI can explain instead of failing silently.
 * Garage (no buy-in) is open to everyone, guests included.
 */
export function venueRequirement(venue: Venue, ctx: VenueEntryContext): VenueRequirement | null {
  if (venue.buyIn <= 0) return null;
  if (ctx.status === 'guest') return 'sign-in';
  if (ctx.status !== 'ready') return null;
  if (ctx.rating < venue.minRating) return 'rating';
  if (ctx.chips < venue.buyIn) return 'chips';
  return null;
}

/** Compact chip amount for a stakes label: `FREE` / `250` / `2K` / `100K` / `1.5M`. */
export function formatChips(value: number): string {
  if (value === 0) return 'FREE';
  if (value >= 1_000_000) return `${value % 1_000_000 === 0 ? value / 1_000_000 : (value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${value % 1_000 === 0 ? value / 1_000 : (value / 1_000).toFixed(1)}K`;
  return `${value}`;
}
