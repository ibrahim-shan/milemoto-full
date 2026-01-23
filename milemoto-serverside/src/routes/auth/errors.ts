import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { logger } from '../../utils/logger.js';
import { httpError } from '../../utils/error.js';

const ALREADY_LOGGED = Symbol.for('milemoto.alreadyLogged');

function markAlreadyLogged(err: unknown) {
  if (err && typeof err === 'object') {
    (err as Record<string | symbol, unknown>)[ALREADY_LOGGED] = true;
  }
}

export function handleAuthRouteError(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    const appErr = httpError(400, 'ValidationError', 'Invalid request');
    (appErr as typeof appErr & { details?: unknown }).details = z.treeifyError(err);
    return next(appErr);
  }

  const status = Number((err as { status?: unknown })?.status) || 500;
  if (status >= 500) {
    markAlreadyLogged(err);
    logger.error(
      { err, path: req.originalUrl, method: req.method, requestId: (req as { id?: unknown }).id },
      'Auth route failed'
    );
  }
  return next(err);
}
