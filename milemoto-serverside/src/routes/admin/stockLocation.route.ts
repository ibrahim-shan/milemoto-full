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

const router = Router();

// List locations
router.get('/', requirePermission('locations.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listStockLocations(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single location
router.get('/:id', requirePermission('locations.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const location = await getStockLocation(id);
    res.json(location);
  } catch (err) {
    next(err);
  }
});

// Create location
router.post('/', requirePermission('locations.manage'), async (req, res, next) => {
  try {
    const data = CreateStockLocation.parse(req.body);
    const location = await createStockLocation(data);
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

// Update location
router.put('/:id', requirePermission('locations.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = UpdateStockLocation.parse(req.body);
    const location = await updateStockLocation(id, data);
    res.json(location);
  } catch (err) {
    next(err);
  }
});

// Delete location
router.delete('/:id', requirePermission('locations.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await deleteStockLocation(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
