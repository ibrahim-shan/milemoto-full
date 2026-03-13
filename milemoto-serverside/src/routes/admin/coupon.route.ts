import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as couponService from '../../services/coupon.service.js';
import { CreateCoupon, ListQuery, UpdateCoupon } from './helpers/coupon.helpers.js';

const router = Router();

router.get(
  '/',
  requirePermission('discounts.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await couponService.listCoupons(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('discounts.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await couponService.getCoupon(id);
    res.json(result);
  })
);

router.post(
  '/',
  requirePermission('discounts.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateCoupon.parse(req.body ?? {});
    const result = await couponService.createCoupon(body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requirePermission('discounts.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = UpdateCoupon.parse(req.body ?? {});
    const result = await couponService.updateCoupon(id, body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  requirePermission('discounts.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await couponService.deleteCoupon(id);
    res.status(204).send();
  })
);

export default router;
