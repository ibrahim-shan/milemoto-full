import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import * as paymentMethodService from '../../services/paymentMethod.service.js';
import {
  ListQuery,
  CreatePaymentMethod,
  UpdatePaymentMethod,
} from './helpers/paymentMethod.helpers.js';

const router = Router();

router.get('/', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await paymentMethodService.listPaymentMethods(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const paymentMethod = await paymentMethodService.getPaymentMethod(id);
    res.json(paymentMethod);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const data = CreatePaymentMethod.parse(req.body);
    const paymentMethod = await paymentMethodService.createPaymentMethod(data);
    res.status(201).json(paymentMethod);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdatePaymentMethod.parse(req.body);
    const paymentMethod = await paymentMethodService.updatePaymentMethod(id, data);
    res.json(paymentMethod);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await paymentMethodService.deletePaymentMethod(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
