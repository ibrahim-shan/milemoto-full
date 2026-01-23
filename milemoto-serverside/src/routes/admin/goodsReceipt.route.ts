import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { httpError } from '../../utils/error.js';
import {
  listGoodsReceipts,
  getGoodsReceipt,
  createGoodsReceipt,
  postGoodsReceipt,
  updateGoodsReceipt,
} from '../../services/goodsReceipt.service.js';
import { ListQuery, CreateGoodsReceipt } from './helpers/goodsReceipt.helpers.js';

const router = Router();

router.get('/', requirePermission('goods_receipts.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listGoodsReceipts(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('goods_receipts.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getGoodsReceipt(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('goods_receipts.manage'), async (req, res, next) => {
  try {
    const body = CreateGoodsReceipt.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createGoodsReceipt(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermission('goods_receipts.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = CreateGoodsReceipt.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await updateGoodsReceipt(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/post', requirePermission('goods_receipts.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const userId = Number(req.user.id);
    const result = await postGoodsReceipt(id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
