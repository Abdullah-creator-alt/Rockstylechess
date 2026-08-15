import { asc, count, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { Router } from 'express';

import { asyncHandler } from './asyncHandler.js';
import { requireAuth } from './authMiddleware.js';
import { claimDailyBonus, getDailyBonusStatus } from './db/dailyBonus.js';
import { db } from './db/client.js';
import { matchParticipants, matches, playerProfiles, users } from './db/schema/index.js';
import { getSpinStatus, performSpin } from './db/spin.js';
import { MATCH_CHIP_REWARDS, type MatchOutcome } from './matchRewards.js';

// Query-param limit shared by /me/matches and /leaderboard -- clamps to a
// sane range so a client can't ask for an unbounded result set.
function clampLimit(raw: unknown, fallback: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), max) : fallback;
}

export const authRouter = Router();

// Signup/login are now served by better-auth at POST /api/auth/sign-up/email
// and POST /api/auth/sign-in/email (see betterAuth.ts + index.ts's mount of
// toNodeHandler(auth)) -- everything below is unchanged.

// Used by pick-rockstar.tsx's "Let's Rock" step -- the stage name + chosen
// avatar are collected one screen after the account itself is created.
authRouter.patch(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { displayName, avatarId } = req.body ?? {};
    const updates: { displayName?: string; avatarId?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (typeof displayName === 'string') updates.displayName = displayName.slice(0, 40);
    if (typeof avatarId === 'string') updates.avatarId = avatarId.slice(0, 40);

    await db.update(playerProfiles).set(updates).where(eq(playerProfiles.userId, req.userId as string));
    res.json({ ok: true });
  }),
);

// The server has been computing rating/wins/losses/chips correctly since
// match persistence was wired up, but until now there was no way for the
// client to ever read any of it back -- signup/login/PATCH only ever wrote.
authRouter.get(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [profile] = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, req.userId as string))
      .limit(1);
    if (!profile) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }
    res.json({ profile });
  }),
);

// Bot/local matches never reach the server otherwise (pure client-side
// chess.js, called from match.tsx's handleGameOver) -- this is the only
// point a reward gets persisted for those modes. Only the outcome claim is
// trusted, never a client-supplied amount, but there's no server-side match
// record for bot/local play to validate the claim itself against, unlike
// online matches (credited authoritatively in persistMatchResult.ts, which
// never calls this route). Acceptable for now since chips aren't redeemable
// for anything real anywhere in the app.
authRouter.post(
  '/me/match-reward',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { outcome } = req.body ?? {};
    if (outcome !== 'win' && outcome !== 'loss' && outcome !== 'draw') {
      res.status(400).json({ error: 'invalid-outcome' });
      return;
    }

    const chipsGranted = MATCH_CHIP_REWARDS[outcome as MatchOutcome];
    const [updated] = await db
      .update(playerProfiles)
      .set({ chips: sql`${playerProfiles.chips} + ${chipsGranted}`, updatedAt: new Date() })
      .where(eq(playerProfiles.userId, req.userId as string))
      .returning({ chips: playerProfiles.chips });
    if (!updated) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }
    res.json({ ok: true, chipsGranted, chips: updated.chips });
  }),
);

authRouter.get(
  '/me/daily-bonus/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getDailyBonusStatus(req.userId as string));
  }),
);

authRouter.post(
  '/me/daily-bonus/claim',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await claimDailyBonus(req.userId as string);
    if (result.alreadyClaimed) {
      res.status(409).json({ error: 'already-claimed-today', day: result.day, streak: result.streak });
      return;
    }
    res.json({
      ok: true,
      day: result.day,
      streak: result.streak,
      chipsGranted: result.chipsGranted,
      gemsGranted: result.gemsGranted,
      chips: result.chips,
      gems: result.gems,
    });
  }),
);

authRouter.get(
  '/me/spin/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getSpinStatus(req.userId as string));
  }),
);

authRouter.post(
  '/me/spin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await performSpin(req.userId as string);
    if (result.alreadySpun) {
      res.status(409).json({ error: 'already-spun-today' });
      return;
    }
    res.json({
      ok: true,
      prizeId: result.prize.id,
      label: result.prize.label,
      rewardType: result.prize.rewardType,
      rewardAmount: result.prize.rewardAmount,
      chips: result.chips,
      gems: result.gems,
    });
  }),
);

authRouter.get(
  '/me/matches',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId as string;
    const limit = clampLimit(req.query.limit, 20, 100);

    const rows = await db
      .select({
        matchId: matchParticipants.matchId,
        color: matchParticipants.color,
        outcome: matchParticipants.outcome,
        ratingBefore: matchParticipants.ratingBefore,
        ratingAfter: matchParticipants.ratingAfter,
        ratingDelta: matchParticipants.ratingDelta,
        playedAt: matches.endedAt,
        mode: matches.mode,
        resultType: matches.resultType,
        whiteUserId: matches.whiteUserId,
        blackUserId: matches.blackUserId,
      })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(eq(matchParticipants.userId, userId))
      .orderBy(desc(matches.endedAt))
      .limit(limit);

    // Batched second query for opponent display names rather than an outer
    // join per row -- there are at most `limit` distinct opponents to look up.
    const opponentIds = [
      ...new Set(
        rows
          .map((row) => (row.color === 'w' ? row.blackUserId : row.whiteUserId))
          .filter((id): id is string => id !== null),
      ),
    ];
    const opponentProfiles = opponentIds.length
      ? await db
          .select({ userId: playerProfiles.userId, displayName: playerProfiles.displayName })
          .from(playerProfiles)
          .where(inArray(playerProfiles.userId, opponentIds))
      : [];
    const opponentNameByUserId = new Map(opponentProfiles.map((p) => [p.userId, p.displayName]));

    res.json({
      matches: rows.map((row) => {
        const opponentUserId = row.color === 'w' ? row.blackUserId : row.whiteUserId;
        return {
          matchId: row.matchId,
          playedAt: row.playedAt,
          mode: row.mode,
          resultType: row.resultType,
          color: row.color,
          outcome: row.outcome,
          ratingBefore: row.ratingBefore,
          ratingAfter: row.ratingAfter,
          ratingDelta: row.ratingDelta,
          opponentDisplayName: (opponentUserId && opponentNameByUserId.get(opponentUserId)) || 'Unknown',
        };
      }),
    });
  }),
);

// Maps account-security.tsx's "Delete Account" button.
authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId as string;

    // matches.white/blackUserId deliberately has no onDelete cascade (see
    // db/schema/matches.ts) -- deleting a user who's played matches should
    // preserve the match/rating record for whoever they played against,
    // not force it to vanish too. Null out the reference on those rows
    // instead of deleting them; everything else that's actually this
    // user's own data (profile, their own match_participants rows, and
    // any future purchases/social rows -- all `onDelete: 'cascade'`) goes
    // via the users row cascade below. One transaction so a mid-way
    // failure can't leave a half-deleted account.
    await db.transaction(async (tx) => {
      await tx.update(matches).set({ whiteUserId: null }).where(eq(matches.whiteUserId, userId));
      await tx.update(matches).set({ blackUserId: null }).where(eq(matches.blackUserId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    res.json({ ok: true });
  }),
);

// Public -- no requireAuth. Plain ORDER BY on player_profiles.rating, per
// the original schema design (no separate leaderboard table to keep in sync).
// Secondary sort on userId -- rating alone has no deterministic order for
// ties, which would otherwise let equal-rated players visibly reshuffle
// between requests.
authRouter.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 50, 100);
    const rows = await db
      .select({
        userId: playerProfiles.userId,
        displayName: playerProfiles.displayName,
        avatarId: playerProfiles.avatarId,
        rating: playerProfiles.rating,
        wins: playerProfiles.wins,
        losses: playerProfiles.losses,
        draws: playerProfiles.draws,
      })
      .from(playerProfiles)
      .orderBy(desc(playerProfiles.rating), asc(playerProfiles.userId))
      .limit(limit);
    res.json({ leaderboard: rows });
  }),
);

// Reports the caller's own position even when it falls outside /leaderboard's
// top page -- deliberately minimal (just rank + total) since every other
// field the "YOU" card needs (rating, displayName, avatarId, wins/losses/
// draws) already comes from GET /me/profile; the client combines both
// rather than this endpoint duplicating profile fields.
authRouter.get(
  '/leaderboard/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId as string;
    const [profile] = await db
      .select({ rating: playerProfiles.rating })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    if (!profile) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }

    const [{ higherRated }] = await db
      .select({ higherRated: count() })
      .from(playerProfiles)
      .where(gt(playerProfiles.rating, profile.rating));
    const [{ totalPlayers }] = await db.select({ totalPlayers: count() }).from(playerProfiles);

    res.json({ rank: higherRated + 1, totalPlayers });
  }),
);
