import { Router } from 'express';
import { z } from 'zod';
import * as variantService from '../../services/variant.service.js';
import { requirePermission } from '../../middleware/authz.js';
import {
  ListQuery,
  CreateVariant,
  UpdateVariant,
  CreateVariantValue,
  UpdateVariantValue,
} from './helpers/variant.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// List variants
router.get(
  '/',
  requirePermission('variants.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await variantService.listVariants(query);
    res.json(result);
  })
);

// Get single variant
router.get(
  '/:id',
  requirePermission('variants.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const variant = await variantService.getVariant(id);
    res.json(variant);
  })
);

// Create variant
router.post(
  '/',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateVariant.parse(req.body);
    const variant = await variantService.createVariant(data);
    res.status(201).json(variant);
  })
);

// Update variant
router.put(
  '/:id',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateVariant.parse(req.body);
    const variant = await variantService.updateVariant(id, data);
    res.json(variant);
  })
);

// Delete variant
router.delete(
  '/:id',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await variantService.deleteVariant(id);
    res.status(204).send();
  })
);

// Add variant value
router.post(
  '/:variantId/values',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const variantId = z.coerce.number().int().min(1).parse(req.params.variantId);
    const data = CreateVariantValue.parse(req.body);
    const value = await variantService.addVariantValue(variantId, data);
    res.status(201).json(value);
  })
);

// Update variant value
router.put(
  '/values/:id',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateVariantValue.parse(req.body);
    const value = await variantService.updateVariantValue(id, data);
    res.json(value);
  })
);

// Delete variant value
router.delete(
  '/values/:id',
  requirePermission('variants.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await variantService.deleteVariantValue(id);
    res.status(204).send();
  })
);

export default router;
