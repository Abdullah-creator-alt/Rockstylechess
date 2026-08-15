import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';

import { allowedTrustedOrigins } from './allowedOrigins.js';
import { db } from './db/client.js';
import { account, playerProfiles, session, users, verification } from './db/schema/index.js';

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is not set');
}

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Reuses the existing `users` table as better-auth's `user` model
    // (rather than a separate table) so playerProfiles/matches/etc.'s
    // existing `references(() => users.id)` FKs need no changes.
    schema: { user: users, session, account, verification },
  }),
  // Keeps Postgres's own `defaultRandom()` (gen_random_uuid()) generating
  // every id below, matching the pre-existing `users.id` column type/shape
  // instead of better-auth's own id format.
  advanced: { database: { generateId: false } },
  trustedOrigins: allowedTrustedOrigins,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  rateLimit: {
    // Rate limiting defaults to production-only; this is an MVP with real
    // brute-force exposure on login/signup even in dev/staging use, so
    // enable it unconditionally.
    enabled: true,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
    },
  },
  // bearer(): lets a session be presented as `Authorization: Bearer <token>`
  // (the raw token is returned via the `set-auth-token` response header on
  // sign-in/sign-up) -- both api.ts's REST calls and socket.ts's handshake
  // auth already depend on a portable token string like this, not a cookie
  // jar, which React Native can't carry across platforms cleanly anyway.
  // expo(): default trustedOrigins for Expo dev clients + the expo-origin
  // header rewrite social login will need later; harmless no-op for the
  // current email/password-only flow.
  plugins: [bearer(), expo()],
  databaseHooks: {
    user: {
      create: {
        // Replaces the old POST /auth/signup handler's
        // `db.insert(playerProfiles)` call -- same defaults (1200 rating,
        // 10M chips) come from playerProfiles's own column defaults.
        after: async (user) => {
          await db.insert(playerProfiles).values({ userId: user.id });
        },
      },
    },
  },
});
