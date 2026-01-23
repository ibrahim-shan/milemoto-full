import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { httpError } from '../../utils/error.js';
import {
  listStockLevels,
  listStockMovements,
  createStockAdjustment,
  createStockTransfer,
} from '../../services/stock.service.js';
import {
  LevelListQuery,
  MovementListQuery,
  AdjustmentInput,
  TransferInput,
} from './helpers/stock.helpers.js';

const router = Router();

router.get('/', requirePermission('stock.read'), async (req, res, next) => {
  try {
    const query = LevelListQuery.parse(req.query);
    const result = await listStockLevels(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/movements', requirePermission('stock_movements.read'), async (req, res, next) => {
  try {
    const query = MovementListQuery.parse(req.query);
    const result = await listStockMovements(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/adjustments', requirePermission('stock_movements.manage'), async (req, res, next) => {
  try {
    const body = AdjustmentInput.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createStockAdjustment(body, Number(req.user.id));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/transfers', requirePermission('stock_movements.manage'), async (req, res, next) => {
  try {
    const body = TransferInput.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createStockTransfer(body, Number(req.user.id));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
