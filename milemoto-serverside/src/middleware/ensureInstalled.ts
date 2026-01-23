import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { users } from '@milemoto/types';
import { runtimeFlags, persistRuntimeFlag } from '../config/runtime.js';
import { db } from '../db/drizzle.js';
import { httpError } from '../utils/error.js';

export async function ensureInstalled(req: Request, _res: Response, next: NextFunction) {
  try {
    if (runtimeFlags.installed) return next();

    // Backward-compatible auto-install: if an admin user exists (e.g. legacy seed),
    // treat the system as installed and persist the flag.
    const [adminRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (adminRow) {
      await persistRuntimeFlag('installed', true);
      return next();
    }

    return next(
      httpError(
        409,
        'NotInstalled',
        'System not initialized. Visit /setup to create the first admin user.'
      )
    );
  } catch (err) {
    return next(err);
  }
}
