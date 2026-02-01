import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to automatically catch errors and forward them to Express error middleware.
 * This eliminates the need for try/catch in every route handler.
 *
 * @example
 * // Before:
 * router.get('/', async (req, res, next) => {
 *   try {
 *     const data = await service.getData();
 *     res.json(data);
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 *
 * // After:
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await service.getData();
 *   res.json(data);
 * }));
 */
export function asyncHandler<
    P = Record<string, string>,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = qs.ParsedQs,
>(
    fn: (
        req: Request<P, ResBody, ReqBody, ReqQuery>,
        res: Response<ResBody>,
        next: NextFunction
    ) => Promise<unknown> | unknown
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Re-export for convenience
export default asyncHandler;
