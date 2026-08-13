// Imported first (and only) by index.ts, before any other local import, so
// that .env is loaded before any module whose top level reads process.env
// (db/client.ts, authMiddleware.ts) gets evaluated. ES module imports are
// hoisted and resolved depth-first in source order regardless of where a
// plain statement sits in the file, so a bare `process.loadEnvFile()` call
// sandwiched between other imports in index.ts would NOT reliably run
// before those other imports' bodies execute -- this dedicated
// zero-import module is what makes the ordering actually work.
try {
  process.loadEnvFile();
} catch {
  // No .env file (e.g. Railway, where env vars are injected directly).
}
