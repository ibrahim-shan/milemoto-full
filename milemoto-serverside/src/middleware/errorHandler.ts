import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

const ALREADY_LOGGED = Symbol.for('milemoto.alreadyLogged');

export function errorHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  type ReqLogger = {
    error?: (obj: unknown, msg?: string) => void;
    warn?: (obj: unknown, msg?: string) => void;
  };
  const log = (req as unknown as { log?: ReqLogger }).log;
  if (err instanceof ZodError) {
    log?.warn?.({ err, path: req.originalUrl, method: req.method }, 'Request validation failed');
    return res
      .status(400)
      .json({ code: 'ValidationError', message: 'Invalid request', details: z.treeifyError(err) });
  }
  const status = Number(err?.status) || 500;
  const code = err?.code || 'InternalError';
  const message = status >= 500 ? 'Internal Server Error' : err?.message || 'Request failed';

  const alreadyLogged = Boolean(err && typeof err === 'object' && err[ALREADY_LOGGED]);

  if (status >= 500 && !alreadyLogged) {
    log?.error?.(
      {
        err,
        status,
        code,
        path: req.originalUrl,
        method: req.method,
        requestId: (req as unknown as { id?: string | number }).id,
      },
      'Unhandled server error'
    );
  } else {
    log?.warn?.(
      {
        err,
        status,
        code,
        path: req.originalUrl,
        method: req.method,
        requestId: (req as unknown as { id?: string | number }).id,
      },
      'Request failed'
    );
  }

  return res
    .status(status)
    .json({ code, message, ...(err?.details ? { details: err.details } : {}) });
}
