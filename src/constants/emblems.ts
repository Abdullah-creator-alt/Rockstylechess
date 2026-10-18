import type { ImageSourcePropType } from 'react-native';

import type { RatingTier } from '@/lib/api';

// Painted emblems (assets/progression/emblems/*.png), cut out of the generated
// green-screen originals in assets/emblems by scripts/cutout-green.py. Metro needs
// literal require() paths, so the maps are written out rather than built dynamically.

// Keyed by title id (economy.config.json -> levels.titles).
export const TITLE_EMBLEMS: Record<string, ImageSourcePropType> = {
  roadie: require('../../assets/progression/emblems/title-roadie.png'),
  'opening-act': require('../../assets/progression/emblems/title-opening-act.png'),
  'support-act': require('../../assets/progression/emblems/title-support-act.png'),
  'local-hero': require('../../assets/progression/emblems/title-local-hero.png'),
  'club-headliner': require('../../assets/progression/emblems/title-club-headliner.png'),
  'arena-act': require('../../assets/progression/emblems/title-arena-act.png'),
  'stadium-star': require('../../assets/progression/emblems/title-stadium-star.png'),
  'main-stage-icon': require('../../assets/progression/emblems/title-main-stage-icon.png'),
  'living-legend': require('../../assets/progression/emblems/title-living-legend.png'),
};

export const TIER_EMBLEMS: Record<RatingTier, ImageSourcePropType> = {
  rookie: require('../../assets/progression/emblems/tier-rookie.png'),
  challenger: require('../../assets/progression/emblems/tier-challenger.png'),
  master: require('../../assets/progression/emblems/tier-master.png'),
  grandmaster: require('../../assets/progression/emblems/tier-grandmaster.png'),
};

export function tierForRating(rating: number): RatingTier {
  if (rating >= 2200) return 'grandmaster';
  if (rating >= 1800) return 'master';
  if (rating >= 1400) return 'challenger';
  return 'rookie';
}
