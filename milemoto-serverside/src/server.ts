import { app } from './app.js';
import { env } from './config/env.js';
import { loadRuntimeFlags } from './config/runtime.js';
import { pingDB, pool } from './db/pool.js';
import { logger } from './utils/logger.js';
import type { Server } from 'http';

let server: Server;
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  // Set a hard timeout for shutdown (30 seconds)
  const forceExitTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);

  try {
    // 1. Stop accepting new connections and wait for in-flight requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error({ err }, 'Error closing HTTP server');
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });
    }

    // 2. Close database connection pool
    await pool.end();
    logger.info('Database pool closed');

    clearTimeout(forceExitTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

async function main() {
  await pingDB();
  await loadRuntimeFlags();

  server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
