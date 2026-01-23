import { Router } from 'express';
import { SetupInitializeSchema } from './setup.helpers.js';
import { getSetupStatus, initializeSetup } from '../services/setup.service.js';

export const setup = Router();

setup.get('/status', async (_req, res, next) => {
  try {
    const status = await getSetupStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

setup.post('/initialize', async (req, res, next) => {
  try {
    const body = SetupInitializeSchema.parse(req.body);
    const result = await initializeSetup(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
