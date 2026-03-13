import { Router, type Request } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { httpError } from '../../utils/error.js';
import {
  listStockLevels,
  listStockMovements,
  getStockSummary,
  getStockFilterOptions,
  createStockAdjustment,
  createStockTransfer,
} from '../../services/stock.service.js';
import {
  LevelListQuery,
  MovementListQuery,
  AdjustmentInput,
  TransferInput,
} from './helpers/stock.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { AuditContext } from '../../services/adminUsers/write.js';

const router = Router();

// Helper to extract audit context from request
function getAuditContext(req: Request): AuditContext {
  return {
    userId: Number(req.user?.id ?? 0),
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

router.get(
  '/summary',
  requirePermission('stock.read'),
  asyncHandler(async (_req, res) => {
    const result = await getStockSummary();
    res.json(result);
  })
);

router.get(
  '/filter-options',
  requirePermission('stock.read'),
  asyncHandler(async (_req, res) => {
    const result = await getStockFilterOptions();
    res.json(result);
  })
);

router.get(
  '/',
  requirePermission('stock.read'),
  asyncHandler(async (req, res) => {
    const query = LevelListQuery.parse(req.query);
    const result = await listStockLevels(query);
    res.json(result);
  })
);

router.get(
  '/movements',
  requirePermission('stock_movements.read'),
  asyncHandler(async (req, res) => {
    const query = MovementListQuery.parse(req.query);
    const result = await listStockMovements(query);
    res.json(result);
  })
);

router.post(
  '/adjustments',
  requirePermission('stock_movements.manage'),
  asyncHandler(async (req, res) => {
    const body = AdjustmentInput.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createStockAdjustment(body, Number(req.user.id), getAuditContext(req));
    res.status(201).json(result);
  })
);

router.post(
  '/transfers',
  requirePermission('stock_movements.manage'),
  asyncHandler(async (req, res) => {
    const body = TransferInput.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await createStockTransfer(body, Number(req.user.id), getAuditContext(req));
    res.status(201).json(result);
  })
);

export default router;
