import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { SendTestEmail, UpdateMailSettings } from '@milemoto/types';
import * as mailService from '../../services/mailSettings.service.js';

const router = Router();

// GET /api/v1/admin/mail
router.get('/', requirePermission('settings.read'), async (_req, res, next) => {
  try {
    const settings = await mailService.getMailSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// PUT /api/v1/admin/mail
router.put('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateMailSettings.parse(req.body);
    const updated = await mailService.updateMailSettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/admin/mail/test
router.post('/test', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = SendTestEmail.parse(req.body);
    const result = await mailService.sendTestEmail(body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
