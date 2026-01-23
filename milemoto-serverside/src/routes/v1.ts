import { Router } from 'express';
import { auth } from './auth/index.js';
import { health } from './health.route.js';
import { setup } from './setup.route.js';
import { webhooks } from './webhooks/index.js';

import { admin } from './admin.route.js';
import { ensureInstalled } from '../middleware/ensureInstalled.js';

export const apiV1 = Router();

apiV1.use('/health', health);

apiV1.use('/auth', auth);
apiV1.use('/setup', setup);
apiV1.use('/webhooks', webhooks);

apiV1.use('/admin', ensureInstalled, admin);
