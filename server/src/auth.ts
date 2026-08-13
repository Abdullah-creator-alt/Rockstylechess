import bcrypt from 'bcryptjs';
import { desc, eq, inArray } from 'drizzle-orm';
import { Router } from 'express';

import { asyncHandler } from './asyncHandler.js';
import { issueToken, requireAuth } from './authMiddleware.js';
import { db } from './db/client.js';
import { matchParticipants, matches, playerProfiles, users } from './db/schema/index.js';

// Query-param limit shared by /me/matches and /leaderboard -- clamps to a
// sane range so a client can't ask for an unbounded result set.
function clampLimit(raw: unknown, fallback: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), max) : fallback;
}

export const authRouter = Router();

authRouter.post(
  '/auth/signup',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'invalid-input' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing) {
      res.status(409).json({ error: 'email-taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ email: normalizedEmail, passwordHash }).returning();
    // Defaults (1200 rating, 10M chips "Welcome Bonus") come from the column
    // defaults in db/schema/users.ts -- nothing to pass here.
    await db.insert(playerProfiles).values({ userId: user.id });

    res.status(201).json({ token: issueToken(user.id) });
  }),
);

authRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'invalid-input' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'invalid-credentials' });
      return;
    }

    res.json({ token: issueToken(user.id) });
  }),
);

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
      .orderBy(desc(playerProfiles.rating))
      .limit(limit);
    res.json({ leaderboard: rows });
  }),
);
