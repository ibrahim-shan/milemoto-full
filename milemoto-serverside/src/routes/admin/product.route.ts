import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { httpError } from '../../utils/error.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listAllProductVariants,
  listProducts,
  updateProduct,
} from '../../services/product.service.js';
import { CreateProduct, ListQuery, UpdateProduct } from './helpers/product.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.post(
  '/',
  requirePermission('products.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateProduct.parse(req.body);
    const result = await createProduct(body);
    res.status(201).json(result);
  })
);

router.get(
  '/variants',
  requirePermission('products.read'),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().default(10),
        search: z.string().optional(),
      })
      .parse(req.query);

    const result = await listAllProductVariants(query);
    res.json(result);
  })
);

router.get(
  '/',
  requirePermission('products.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listProducts(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('products.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await getProduct(id);
    if (!result) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.json(result);
  })
);

router.put(
  '/:id',
  requirePermission('products.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = UpdateProduct.parse(req.body);
    const result = await updateProduct(id, body);
    if (!result) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.json(result);
  })
);

router.delete(
  '/:id',
  requirePermission('products.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await deleteProduct(id);
    if (!result.success) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.status(200).json(result);
  })
);

export default router;
