import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

const ALREADY_LOGGED = Symbol.for('milemoto.alreadyLogged');

// Sensitive fields to redact from request body
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'accessToken'];

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body } as Record<string, unknown>;
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

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

  // Extract user ID from authenticated request
  const userId = (req as unknown as { user?: { id?: number } }).user?.id ?? null;

  // Build structured error context
  const errorContext = {
    // Error details
    err,
    stack: err?.stack,
    status: Number(err?.status) || 500,
    code: err?.code || 'InternalError',

    // Request context
    path: req.originalUrl,
    method: req.method,
    requestId: (req as unknown as { id?: string | number }).id,
    userId,
    ip: req.ip || req.socket?.remoteAddress,

    // Request data (sanitized)
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.body ? sanitizeBody(req.body) : undefined,
  };

  if (err instanceof ZodError) {
    const validationContext = {
      ...errorContext,
      status: 400,
      code: 'ValidationError',
    };
    log?.warn?.(
      { ...validationContext, validationErrors: z.treeifyError(err) },
      'Request validation failed'
    );
    return res
      .status(400)
      .json({ code: 'ValidationError', message: 'Invalid request', details: z.treeifyError(err) });
  }

  const status = errorContext.status;
  const code = errorContext.code;
  const message = status >= 500 ? 'Internal Server Error' : err?.message || 'Request failed';

  const alreadyLogged = Boolean(err && typeof err === 'object' && err[ALREADY_LOGGED]);

  if (status >= 500 && !alreadyLogged) {
    log?.error?.(errorContext, 'Unhandled server error');
  } else if (!alreadyLogged) {
    log?.warn?.(errorContext, 'Request failed');
  }

  return res
    .status(status)
    .json({ code, message, ...(err?.details ? { details: err.details } : {}) });
}
