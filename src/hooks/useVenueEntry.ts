import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { formatChips, venueRequirement, type Venue, type VenueRequirement } from '@/constants/venues';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import type { Duration } from '@/lib/onlineMatch';

// Shared by home.tsx and (play)/setup.tsx: decides whether the player can enter a
// venue, explains why not, and puts the buy-in confirmation in front of every
// wagered match. The server enforces all of this again (queue:join / escrow); this
// is the friendly explanation, not the security.
export function useVenueEntry() {
  const router = useRouter();
  const { status, profile } = usePlayerProfile();
  const ctx = { status, chips: profile?.chips ?? 0, rating: profile?.rating ?? 0 };

  function requirementFor(venue: Venue): VenueRequirement | null {
    return venueRequirement(venue, ctx);
  }

  function explain(venue: Venue, requirement: VenueRequirement): void {
    if (requirement === 'sign-in') {
      Alert.alert(`${venue.name} is played for chips`, 'Sign in to play for chips. The Garage is always free.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') },
      ]);
    } else if (requirement === 'rating') {
      Alert.alert(
        `${venue.name} is locked`,
        `You need a rating of ${venue.minRating} to enter (yours is ${ctx.rating}). Win matches at the lower venues to climb.`,
      );
    } else {
      Alert.alert(
        `Not enough chips`,
        `${venue.name} costs ${venue.buyIn.toLocaleString('en-US')} chips to enter and you have ${ctx.chips.toLocaleString('en-US')}.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Get Chips', onPress: () => router.push('/shop') },
        ],
      );
    }
  }

  function startMatch(venue: Venue, duration: Duration): void {
    router.push({ pathname: '/matchmaking', params: { venueTier: venue.id, duration } });
  }

  // "Play Now": free venues go straight in; wagered ones ask first.
  function tryPlay(venue: Venue, duration: Duration): void {
    const requirement = requirementFor(venue);
    if (requirement) {
      explain(venue, requirement);
      return;
    }
    if (venue.buyIn <= 0) {
      startMatch(venue, duration);
      return;
    }
    Alert.alert(
      `Enter ${venue.name}?`,
      `Pay ${venue.buyIn.toLocaleString('en-US')} chips to play. The winner takes ${venue.prize.toLocaleString('en-US')} (10% house cut). A draw returns your buy-in, and so does leaving in the first 3 moves.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Pay ${formatChips(venue.buyIn)} & Play`, onPress: () => startMatch(venue, duration) },
      ],
    );
  }

  return { requirementFor, explain, tryPlay };
}
