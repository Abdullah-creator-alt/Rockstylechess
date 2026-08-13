import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const gameModeEnum = pgEnum('game_mode', ['bot', 'local', 'online']);
export const matchResultTypeEnum = pgEnum('match_result_type', [
  'checkmate',
  'stalemate',
  'draw',
  'resignation',
  'forfeit',
]);
export const pieceColorEnum = pgEnum('piece_color', ['w', 'b']);
export const matchOutcomeEnum = pgEnum('match_outcome', ['win', 'loss', 'draw']);

// One row per match. white/blackUserId are nullable because guest-vs-guest
// and bot-mode matches (resolved entirely client-side, never reaching the
// server) never produce a row here at all -- when they're null the match
// simply isn't in this table, not "for a guest".
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteUserId: uuid('white_user_id').references(() => users.id),
  blackUserId: uuid('black_user_id').references(() => users.id),
  mode: gameModeEnum('mode').notNull(),
  venueTier: text('venue_tier'),
  resultType: matchResultTypeEnum('result_type').notNull(),
  winnerColor: pieceColorEnum('winner_color'),
  pgn: text('pgn'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull().defaultNow(),
});

// One row per human player per match -- this is what iron-id.tsx's match
// history list and world-rankings.tsx's leaderboard (ORDER BY rating on
// player_profiles, no separate leaderboard table) are meant to read from.
export const matchParticipants = pgTable('match_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  color: pieceColorEnum('color').notNull(),
  outcome: matchOutcomeEnum('outcome').notNull(),
  ratingBefore: integer('rating_before').notNull(),
  ratingAfter: integer('rating_after').notNull(),
  ratingDelta: integer('rating_delta').notNull(),
});
