import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { formatChips, venueRequirement, type Venue, type VenueRequirement } from '@/constants/venues';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { safetyNetTerms } from '@/lib/gear';
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

  function startMatch(venue: Venue, duration: Duration, insured = false): void {
    router.push({ pathname: '/matchmaking', params: { venueTier: venue.id, duration, ...(insured ? { insured: '1' } : {}) } });
  }

  // "Play Now": free venues go straight in; wagered ones ask first. `insured` = the player ticked the
  // Safety Net (an optional add-on, wagered venues only; the server re-checks the balance).
  function tryPlay(venue: Venue, duration: Duration, insured = false): void {
    const requirement = requirementFor(venue);
    if (requirement) {
      explain(venue, requirement);
      return;
    }
    if (venue.buyIn <= 0) {
      startMatch(venue, duration);
      return;
    }
    const net = insured ? safetyNetTerms(venue.buyIn) : null;
    if (net && ctx.chips < venue.buyIn + net.premium) {
      Alert.alert(
        'Not enough chips for the Safety Net',
        `${venue.name} costs ${venue.buyIn.toLocaleString('en-US')} chips plus ${net.premium.toLocaleString('en-US')} for the Safety Net, and you have ${ctx.chips.toLocaleString('en-US')}.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: `Play without it`, onPress: () => startMatch(venue, duration) },
        ],
      );
      return;
    }
    const total = venue.buyIn + (net?.premium ?? 0);
    Alert.alert(
      `Enter ${venue.name}?`,
      `Pay ${venue.buyIn.toLocaleString('en-US')} chips to play. The winner takes ${venue.prize.toLocaleString('en-US')} (10% house cut). A draw returns your buy-in, and so does leaving in the first 3 moves.` +
        (net ? ` Safety Net: ${net.premium.toLocaleString('en-US')} more up front, and if you lose ${net.cover.toLocaleString('en-US')} comes back.` : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Pay ${formatChips(total)} & Play`, onPress: () => startMatch(venue, duration, insured) },
      ],
    );
  }

  return { requirementFor, explain, tryPlay };
}
