import { eq, sql } from 'drizzle-orm';

import type { MatchState, PieceColor } from '../match.js';
import { db } from './client.js';
import { expectedScore, updatedRating } from './elo.js';
import { matchParticipants, matches, playerProfiles } from './schema/index.js';

type ResultType = 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'forfeit';

function scoreFor(color: PieceColor, resultType: ResultType, winnerColor: PieceColor | null): number {
  if (resultType === 'stalemate' || resultType === 'draw') return 0.5;
  return winnerColor === color ? 1 : 0;
}

// Fire-and-forget from index.ts, always AFTER the socket broadcast that
// actually ends the match for both players -- a database hiccup here should
// degrade to "this result didn't save," never to blocking or delaying live
// gameplay. Only records anything when BOTH seats are real, server-verified
// accounts (see MatchPlayer.userId in match.ts); a guest-involving match
// plays identically to today and simply isn't persisted.
export async function persistMatchResult(
  match: MatchState,
  resultType: ResultType,
  winnerColor: PieceColor | null,
): Promise<void> {
  const white = match.players.w;
  const black = match.players.b;
  if (!white.userId || !black.userId) return;

  const [whiteProfile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, white.userId)).limit(1);
  const [blackProfile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, black.userId)).limit(1);
  if (!whiteProfile || !blackProfile) return;

  const whiteScore = scoreFor('w', resultType, winnerColor);
  const blackScore = 1 - whiteScore;
  const whiteExpected = expectedScore(whiteProfile.rating, blackProfile.rating);
  const blackExpected = 1 - whiteExpected;
  const whiteRatingAfter = updatedRating(whiteProfile.rating, whiteExpected, whiteScore);
  const blackRatingAfter = updatedRating(blackProfile.rating, blackExpected, blackScore);

  const [insertedMatch] = await db
    .insert(matches)
    .values({
      whiteUserId: white.userId,
      blackUserId: black.userId,
      mode: 'online',
      resultType,
      winnerColor,
      pgn: match.chess.pgn(),
      startedAt: match.createdAt,
    })
    .returning();

  await db.insert(matchParticipants).values([
    {
      matchId: insertedMatch.id,
      userId: white.userId,
      color: 'w',
      outcome: outcomeFor(whiteScore),
      ratingBefore: whiteProfile.rating,
      ratingAfter: whiteRatingAfter,
      ratingDelta: whiteRatingAfter - whiteProfile.rating,
    },
    {
      matchId: insertedMatch.id,
      userId: black.userId,
      color: 'b',
      outcome: outcomeFor(blackScore),
      ratingBefore: blackProfile.rating,
      ratingAfter: blackRatingAfter,
      ratingDelta: blackRatingAfter - blackProfile.rating,
    },
  ]);

  await Promise.all([
    updateProfileStats(white.userId, whiteRatingAfter, whiteScore),
    updateProfileStats(black.userId, blackRatingAfter, blackScore),
  ]);
}

function outcomeFor(score: number): 'win' | 'loss' | 'draw' {
  if (score === 1) return 'win';
  if (score === 0) return 'loss';
  return 'draw';
}

async function updateProfileStats(userId: string, ratingAfter: number, score: number): Promise<void> {
  await db
    .update(playerProfiles)
    .set({
      rating: ratingAfter,
      wins: sql`${playerProfiles.wins} + ${score === 1 ? 1 : 0}`,
      losses: sql`${playerProfiles.losses} + ${score === 0 ? 1 : 0}`,
      draws: sql`${playerProfiles.draws} + ${score === 0.5 ? 1 : 0}`,
      winStreak: score === 1 ? sql`${playerProfiles.winStreak} + 1` : sql`0`,
      updatedAt: new Date(),
    })
    .where(eq(playerProfiles.userId, userId));
}
