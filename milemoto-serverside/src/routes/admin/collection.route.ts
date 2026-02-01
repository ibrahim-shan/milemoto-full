import { Router } from 'express';
import { z } from 'zod';
import * as collectionService from '../../services/collection.service.js';
import { requirePermission } from '../../middleware/authz.js';
import {
  CreateCollection,
  UpdateCollection,
  ListQuery,
  CollectionRule,
} from './helpers/collection.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// List collections
router.get(
  '/',
  requirePermission('collections.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await collectionService.listCollections(query);
    res.json(result);
  })
);

// Get collection
router.get(
  '/:id',
  requirePermission('collections.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const collection = await collectionService.getCollection(id);
    res.json(collection);
  })
);

// Create collection
router.post(
  '/',
  requirePermission('collections.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateCollection.parse(req.body);
    const collection = await collectionService.createCollection(data);
    res.status(201).json(collection);
  })
);

// Update collection
router.put(
  '/:id',
  requirePermission('collections.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateCollection.parse(req.body);
    const collection = await collectionService.updateCollection(id, data);
    res.json(collection);
  })
);

// Delete collection
router.delete(
  '/:id',
  requirePermission('collections.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await collectionService.deleteCollection(id);
    res.status(204).send();
  })
);

// Add variants to manual collection
router.post(
  '/:id/products',
  requirePermission('collections.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = z.object({ variantIds: z.array(z.number().int().positive()) }).parse(req.body);
    const result = await collectionService.addProducts(id, body.variantIds);
    res.json(result);
  })
);

// Remove variant from manual collection
router.delete(
  '/:id/products/:variantId',
  requirePermission('collections.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const variantId = z.coerce.number().int().min(1).parse(req.params.variantId);
    const result = await collectionService.removeProduct(id, variantId);
    res.json(result);
  })
);

// Preview automatic collection rules (no DB writes)
router.post(
  '/:id/preview',
  requirePermission('collections.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = z
      .object({
        rules: z.array(CollectionRule).optional(),
        matchType: z.enum(['all', 'any']).optional(),
        limit: z.number().int().positive().max(200).optional(),
      })
      .parse(req.body ?? {});
    const result = await collectionService.previewCollection(id, body);
    res.json(result);
  })
);

// List products in a collection (manual only but safe for both)
router.get(
  '/:id/products',
  requirePermission('collections.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await collectionService.listCollectionProducts(id);
    res.json(result);
  })
);

export default router;
