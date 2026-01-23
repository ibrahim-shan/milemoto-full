import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { smsTestLimiter } from '../../middleware/rateLimit.js';
import { CreateSmsGateway, SendTestSms, SendTestWhatsapp, UpdateSmsGateway } from '@milemoto/types';
import * as smsGatewayService from '../../services/smsGateway.service.js';
import { httpError } from '../../utils/error.js';

const router = Router();

function normalizePhoneInput(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s()\-]/g, '');
}

// GET /api/v1/admin/sms-gateways
router.get('/', requirePermission('settings.read'), async (_req, res, next) => {
  try {
    const gateways = await smsGatewayService.listSmsGateways();
    res.json(gateways);
  } catch (e) {
    next(e);
  }
});

// GET /api/v1/admin/sms-gateways/delivery-reports
router.get('/delivery-reports', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const reports = await smsGatewayService.listSmsDeliveryReports(limit);
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/admin/sms-gateways
router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = CreateSmsGateway.parse(req.body);
    const created = await smsGatewayService.createSmsGateway(body);
    res.json(created);
  } catch (e) {
    next(e);
  }
});

// PUT /api/v1/admin/sms-gateways/:id
router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw httpError(400, 'InvalidId', 'Invalid gateway id.');
    }
    const body = UpdateSmsGateway.parse(req.body);
    const updated = await smsGatewayService.updateSmsGateway(id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/admin/sms-gateways/:id/activate
router.post('/:id/activate', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw httpError(400, 'InvalidId', 'Invalid gateway id.');
    }
    const updated = await smsGatewayService.activateSmsGateway(id);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/admin/sms-gateways/test
router.post(
  '/test',
  requirePermission('settings.manage'),
  smsTestLimiter,
  async (req, res, next) => {
    try {
      const body = SendTestSms.parse({
        ...req.body,
        toNumber: normalizePhoneInput(req.body?.toNumber),
      });
      const result = await smsGatewayService.sendTestSms(body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// POST /api/v1/admin/sms-gateways/test-whatsapp
router.post(
  '/test-whatsapp',
  requirePermission('settings.manage'),
  smsTestLimiter,
  async (req, res, next) => {
    try {
      const body = SendTestWhatsapp.parse({
        ...req.body,
        toNumber: normalizePhoneInput(req.body?.toNumber),
      });
      const result = await smsGatewayService.sendTestWhatsapp(body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
