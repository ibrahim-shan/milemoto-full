import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listAuditLogs } from '../../services/auditLog.service.js';
import { ListAuditLogsQuerySchema } from '@milemoto/types';

const router = Router();

// List audit logs (requires settings.read permission)
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListAuditLogsQuerySchema.parse(req.query);
    const result = await listAuditLogs(query);
    res.json(result);
  })
);

export default router;
