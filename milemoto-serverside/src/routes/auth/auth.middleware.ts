import type { Request, RequestHandler } from 'express';
import { httpError } from '../../utils/error.js';

export function getUserOrThrow(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw httpError(401, 'Unauthorized', 'Authentication required');
  }
  return req.user;
}

export const requireUser: RequestHandler = (req, _res, next) => {
  try {
    getUserOrThrow(req);
    next();
  } catch (err) {
    next(err);
  }
};
