import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import {
  createStockLocation,
  deleteStockLocation,
  getStockLocation,
  listStockLocations,
  updateStockLocation,
} from '../../services/stockLocation.service.js';
import {
  CreateStockLocation,
  ListQuery,
  UpdateStockLocation,
} from './helpers/stockLocation.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// List locations
router.get(
  '/',
  requirePermission('locations.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listStockLocations(query);
    res.json(result);
  })
);

// Get single location
router.get(
  '/:id',
  requirePermission('locations.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const location = await getStockLocation(id);
    res.json(location);
  })
);

// Create location
router.post(
  '/',
  requirePermission('locations.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateStockLocation.parse(req.body);
    const location = await createStockLocation(data);
    res.status(201).json(location);
  })
);

// Update location
router.put(
  '/:id',
  requirePermission('locations.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = UpdateStockLocation.parse(req.body);
    const location = await updateStockLocation(id, data);
    res.json(location);
  })
);

// Delete location
router.delete(
  '/:id',
  requirePermission('locations.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await deleteStockLocation(id);
    res.status(204).send();
  })
);

export default router;
