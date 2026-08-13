import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 does not catch rejections from async route handlers -- an
// unhandled one becomes an unhandled promise rejection at the process
// level, which crashes the entire server (confirmed: a DB outage during
// /auth/signup took down live in-progress matches too, not just that one
// request). Wrapping every async handler in this forwards the error to
// Express's error-handling middleware (see index.ts) instead, so a failure
// in one request returns a 500 to that request alone.
export function asyncHandler(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next as NextFunction);
  };
}
