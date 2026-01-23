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

const router = Router();

router.post('/', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const body = CreateProduct.parse(req.body);
    const result = await createProduct(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/variants', requirePermission('products.read'), async (req, res, next) => {
  try {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().default(10),
        search: z.string().optional(),
      })
      .parse(req.query);

    const result = await listAllProductVariants(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', requirePermission('products.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listProducts(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('products.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await getProduct(id);
    if (!result) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = UpdateProduct.parse(req.body);
    const result = await updateProduct(id, body);
    if (!result) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await deleteProduct(id);
    if (!result.success) {
      throw httpError(404, 'NotFound', 'Product not found');
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
