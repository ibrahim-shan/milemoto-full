import { Request, Response, NextFunction } from 'express';
import { httpError } from '../utils/error.js';
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  return next(httpError(404, 'NotFound', 'Not Found'));
}
