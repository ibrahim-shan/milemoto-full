import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import * as inboundShippingMethodService from '../../services/inboundShippingMethod.service.js';
import {
  ListQuery,
  CreateInboundShippingMethod,
  UpdateInboundShippingMethod,
} from './helpers/inboundShippingMethod.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await inboundShippingMethodService.listInboundShippingMethods(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const method = await inboundShippingMethodService.getInboundShippingMethod(id);
    res.json(method);
  })
);

router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateInboundShippingMethod.parse(req.body);
    const method = await inboundShippingMethodService.createInboundShippingMethod(data);
    res.status(201).json(method);
  })
);

router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateInboundShippingMethod.parse(req.body);
    const method = await inboundShippingMethodService.updateInboundShippingMethod(id, data);
    res.json(method);
  })
);

router.delete(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await inboundShippingMethodService.deleteInboundShippingMethod(id);
    res.status(204).send();
  })
);

export default router;
