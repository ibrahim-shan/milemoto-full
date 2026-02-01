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
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  requirePermission('goods_receipts.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listGoodsReceipts(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('goods_receipts.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getGoodsReceipt(id);
    res.json(result);
  })
);

router.post(
  '/',
  requirePermission('goods_receipts.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateGoodsReceipt.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createGoodsReceipt(body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requirePermission('goods_receipts.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = CreateGoodsReceipt.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await updateGoodsReceipt(id, body);
    res.json(result);
  })
);

router.post(
  '/:id/post',
  requirePermission('goods_receipts.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const userId = Number(req.user.id);
    const result = await postGoodsReceipt(id, userId);
    res.json(result);
  })
);

export default router;
