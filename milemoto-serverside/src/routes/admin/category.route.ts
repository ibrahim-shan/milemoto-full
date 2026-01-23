import { Router } from 'express';
import { z } from 'zod';
import * as categoryService from '../../services/category.service.js';
import { requirePermission } from '../../middleware/authz.js';
import { ListQuery, CreateCategory, UpdateCategory } from './helpers/category.helpers.js';

const router = Router();

// GET /admin/categories
router.get('/', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await categoryService.listCategories(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/categories/tree
router.get('/tree', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const tree = await categoryService.getCategoryTree();
    res.json(tree);
  } catch (error) {
    next(error);
  }
});

// GET /admin/categories/all
router.get('/all', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const includeInactive =
      ['1', 'true', 'yes'].includes(String(req.query.includeInactive ?? '').toLowerCase()) || false;
    const onlyRoots =
      ['1', 'true', 'yes'].includes(String(req.query.onlyRoots ?? '').toLowerCase()) || false;

    const items = await categoryService.listAllCategories(includeInactive, onlyRoots);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// GET /admin/categories/:id
router.get('/:id', requirePermission('categories.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const category = await categoryService.getCategory(id);
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// POST /admin/categories
router.post('/', requirePermission('categories.manage'), async (req, res, next) => {
  try {
    const data = CreateCategory.parse(req.body);
    const category = await categoryService.createCategory(data);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// PUT /admin/categories/:id
router.put('/:id', requirePermission('categories.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateCategory.parse(req.body);
    const category = await categoryService.updateCategory(id, data);
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/categories/:id
router.delete('/:id', requirePermission('categories.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await categoryService.deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
