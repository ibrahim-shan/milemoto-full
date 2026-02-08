import express, { type Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { api } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestTimeout } from './middleware/requestTimeout.js';
import { logger } from './utils/logger.js';
import { httpError } from './utils/error.js';
import { env } from './config/env.js';
import { authLimiter } from './middleware/rateLimit.js';

export const app = express();
app.set('trust proxy', env.TRUST_PROXY);

const allowed = new Set(env.CORS_ORIGINS.split(',').map((s) => s.trim()));
const allowedHosts = new Set(
  env.ALLOWED_HOSTS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

app.use((req, _res, next) => {
  if (allowedHosts.size === 0) return next();
  const hostHeader = (req.headers.host ?? '').toString().toLowerCase();
  const hostname = (req.hostname ?? '').toLowerCase();
  if (allowedHosts.has(hostHeader) || allowedHosts.has(hostname)) return next();
  return next(httpError(400, 'InvalidHost', 'Host not allowed'));
});

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-csrf-token'],
    exposedHeaders: ['X-Request-Id'],
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use('/api/v1/auth', authLimiter);

app.use(
  express.json({
    limit: '1mb',
    verify(req, _res, buf) {
      (req as Request).rawBody = buf.toString('utf8');
    },
  })
);
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId(req) {
      const hdr = (req.headers['x-request-id'] || '').toString();
      return hdr || crypto.randomUUID();
    },
  })
);

// Echo back the request id for clients and correlation in logs
app.use((req, res, next) => {
  const id = req.id;
  if (id && (typeof id === 'string' || typeof id === 'number')) {
    res.setHeader('X-Request-Id', id);
  }

  next();
});

app.get('/', (_req, res) => res.json({ name: 'MileMoto API', version: '0.1.0' }));

// Global request timeout (30 seconds)
app.use(requestTimeout(30_000));

app.use('/api', api);

app.use(notFound);
app.use(errorHandler);
