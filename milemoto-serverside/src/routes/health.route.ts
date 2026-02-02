import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/drizzle.js';

export const health = Router();

health.get('/', async (_req, res) => {
  const time = new Date().toISOString();

  try {
    // Test actual database connectivity
    await db.execute(sql`SELECT 1`);

    res.json({
      ok: true,
      service: 'milemoto-serverside',
      database: 'connected',
      time,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: 'milemoto-serverside',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Database connection failed',
      time,
    });
  }
});
