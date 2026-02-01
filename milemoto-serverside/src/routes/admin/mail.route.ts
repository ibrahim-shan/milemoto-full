import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { SendTestEmail, UpdateMailSettings } from '@milemoto/types';
import * as mailService from '../../services/mailSettings.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// GET /api/v1/admin/mail
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (_req, res) => {
    const settings = await mailService.getMailSettings();
    res.json(settings);
  })
);

// PUT /api/v1/admin/mail
router.put(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const body = UpdateMailSettings.parse(req.body);
    const updated = await mailService.updateMailSettings(body);
    res.json(updated);
  })
);

// POST /api/v1/admin/mail/test
router.post(
  '/test',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const body = SendTestEmail.parse(req.body);
    const result = await mailService.sendTestEmail(body);
    res.json(result);
  })
);

export default router;
