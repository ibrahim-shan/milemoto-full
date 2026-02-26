import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/asyncHandler.js';
import { listAllCities, listAllCountries, listAllStates } from '../services/location.service.js';

export const locations = Router();

function setPublicCache(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
}

locations.get(
  '/countries',
  asyncHandler(async (_req, res) => {
    const items = await listAllCountries(false);
    setPublicCache(res);
    res.json({ items });
  })
);

locations.get(
  '/states',
  asyncHandler(async (req, res) => {
    const countryId = req.query.countryId
      ? z.coerce.number().int().min(1).parse(req.query.countryId)
      : undefined;
    const allStates = await listAllStates();
    const items = countryId
      ? allStates.filter((it) => Number(it.countryId) === countryId)
      : allStates;
    setPublicCache(res);
    res.json({ items });
  })
);

locations.get(
  '/cities',
  asyncHandler(async (req, res) => {
    const stateId = req.query.stateId
      ? z.coerce.number().int().min(1).parse(req.query.stateId)
      : undefined;
    const items = await listAllCities(stateId);
    setPublicCache(res);
    res.json({ items });
  })
);
