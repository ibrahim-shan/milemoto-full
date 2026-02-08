import type { Request, Response, NextFunction } from 'express';

/**
 * Request timeout middleware.
 * Automatically aborts requests that take longer than the specified duration.
 *
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30 seconds)
 */
export function requestTimeout(timeoutMs = 30_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set the request timeout
    req.setTimeout(timeoutMs);

    // Track if response has been sent
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;

      // Only send timeout response if headers haven't been sent
      if (!res.headersSent) {
        res.status(408).json({
          code: 'RequestTimeout',
          message: `Request timed out after ${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    // Clear timeout on close (client disconnect)
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    // Wrap next to prevent further processing after timeout
    const originalEnd = res.end.bind(res);
    res.end = function (...args: Parameters<typeof res.end>) {
      if (timedOut) {
        return res; // Don't process if already timed out
      }
      return originalEnd(...args);
    } as typeof res.end;

    next();
  };
}

/**
 * Route-specific timeout wrapper for long-running operations.
 * Use this on specific routes that need custom timeouts.
 *
 * @example
 * router.post('/upload', withTimeout(60000), asyncHandler(...));
 */
export function withTimeout(timeoutMs: number) {
  return requestTimeout(timeoutMs);
}
