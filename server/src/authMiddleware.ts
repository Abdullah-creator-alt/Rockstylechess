import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

// Typed as a plain `string` (not `string | undefined`) via this IIFE rather
// than a `const X = process.env.X; if (!X) throw` guard -- TS's control-flow
// narrowing from that guard doesn't carry into the function bodies declared
// below, which close over this module-scoped constant.
const JWT_SECRET: string = (() => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
})();

// No refresh-token complexity for a mobile game MVP -- a long-lived token
// re-issued on login is enough.
const TOKEN_EXPIRY = '30d';

export function issueToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Rejects the request outright -- for endpoints that require a real
// signed-in account (currently just PATCH /me/profile).
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.userId = userId;
  next();
}

// Socket.IO connection middleware -- unlike requireAuth, a missing/invalid
// token doesn't reject the connection: anonymous/guest play (src/lib/
// playerId.ts's guest UUID) keeps working exactly as before. It just means
// socket.data.userId stays unset, and match persistence (persistMatchResult.ts)
// never fires for that seat -- a client-supplied "I'm logged in" claim would
// be forgeable, a server-verified JWT isn't.
export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  const userId = token ? verifyToken(token) : null;
  if (userId) socket.data.userId = userId;
  next();
}
