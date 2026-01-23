import { Router } from 'express';
import { z } from 'zod';
import * as brandService from '../../services/brand.service.js';
import { requirePermission } from '../../middleware/authz.js';
import { ListQuery, CreateBrand, UpdateBrand } from './helpers/brand.helpers.js';

const router = Router();

// GET /admin/brands
router.get('/', requirePermission('brands.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await brandService.listBrands(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/brands/:id
router.get('/:id', requirePermission('brands.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const brand = await brandService.getBrand(id);
    res.json(brand);
  } catch (error) {
    next(error);
  }
});

// POST /admin/brands
router.post('/', requirePermission('brands.manage'), async (req, res, next) => {
  try {
    const data = CreateBrand.parse(req.body);
    const brand = await brandService.createBrand(data);
    res.status(201).json(brand);
  } catch (error) {
    next(error);
  }
});

// PUT /admin/brands/:id
router.put('/:id', requirePermission('brands.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateBrand.parse(req.body);
    const brand = await brandService.updateBrand(id, data);
    res.json(brand);
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/brands/:id
router.delete('/:id', requirePermission('brands.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await brandService.deleteBrand(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
