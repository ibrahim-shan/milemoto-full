import { Router } from 'express';
import infobip from './infobip.route.js';

export const webhooks = Router();

webhooks.use('/infobip', infobip);
