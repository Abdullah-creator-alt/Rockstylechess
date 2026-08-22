import { defineConfig } from 'drizzle-kit';

// ENV_FILE lets `npm run db:migrate:remote`/`db:generate:remote` point this
// at .env.production (the real Neon DATABASE_URL) instead of the local-
// Postgres .env `npm run dev`/`db:migrate` use day to day -- see
// server/README.md's "Local development" section.
try {
  process.loadEnvFile(process.env.ENV_FILE ?? '.env');
} catch {
  // No .env file (e.g. CI/Railway, where DATABASE_URL is injected directly).
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: connectionString,
  },
});
