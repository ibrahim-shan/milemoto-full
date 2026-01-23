import { Router } from 'express';

import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import {
  UpdateShippingMethod,
  CreateAreaRate,
  UpdateAreaRate,
  ListQuery,
} from './helpers/shipping.helpers.js';
import {
  listShippingMethods,
  updateShippingMethod,
  createAreaRate,
  listAreaRates,
  updateAreaRate,
  deleteAreaRate,
} from '../../services/shipping.service.js';

const router = Router();

// Secure all routes

// ==== Global Shipping Methods (GET / UPDATE) ====

/**
 * GET /api/v1/admin/shipping/methods
 * List all shipping methods (Flat Rate, Area Wise, Product Wise)
 */
router.get('/methods', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const methods = await listShippingMethods();
    res.json(methods);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/shipping/methods/:code
 * Update a shipping method (e.g., toggle status or set flat rate cost)
 */
router.put('/methods/:code', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const code = z.enum(['productWise', 'flatRate', 'areaWise']).parse(req.params.code);
    const body = UpdateShippingMethod.parse(req.body);
    const updated = await updateShippingMethod(code, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ==== Area Wise Rates (CRUD) ====

/**
 * GET /api/v1/admin/shipping/area-rates
 * List area rates with pagination
 */
router.get('/area-rates', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const data = await listAreaRates(query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/v1/admin/shipping/area-rates
 * Create a new area rate rule
 */
router.post('/area-rates', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateAreaRate.parse(req.body);
    const rate = await createAreaRate(payload);
    res.status(201).json(rate);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/shipping/area-rates/:id
 * Update an area rate (cost only)
 */
router.put('/area-rates/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateAreaRate.parse(req.body);
    const updated = await updateAreaRate(id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/v1/admin/shipping/area-rates/:id
 * Delete an area rate rule
 */
router.delete('/area-rates/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteAreaRate(id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
