import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { smsTestLimiter } from '../../middleware/rateLimit.js';
import { CreateSmsGateway, SendTestSms, SendTestWhatsapp, UpdateSmsGateway } from '@milemoto/types';
import * as smsGatewayService from '../../services/smsGateway.service.js';
import { httpError } from '../../utils/error.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

function normalizePhoneInput(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s()\-]/g, '');
}

// GET /api/v1/admin/sms-gateways
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (_req, res) => {
    const gateways = await smsGatewayService.listSmsGateways();
    res.json(gateways);
  })
);

// GET /api/v1/admin/sms-gateways/delivery-reports
router.get(
  '/delivery-reports',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const reports = await smsGatewayService.listSmsDeliveryReports(limit);
    res.json(reports);
  })
);

// POST /api/v1/admin/sms-gateways
router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateSmsGateway.parse(req.body);
    const created = await smsGatewayService.createSmsGateway(body);
    res.json(created);
  })
);

// PUT /api/v1/admin/sms-gateways/:id
router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw httpError(400, 'InvalidId', 'Invalid gateway id.');
    }
    const body = UpdateSmsGateway.parse(req.body);
    const updated = await smsGatewayService.updateSmsGateway(id, body);
    res.json(updated);
  })
);

// POST /api/v1/admin/sms-gateways/:id/activate
router.post(
  '/:id/activate',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw httpError(400, 'InvalidId', 'Invalid gateway id.');
    }
    const updated = await smsGatewayService.activateSmsGateway(id);
    res.json(updated);
  })
);

// POST /api/v1/admin/sms-gateways/test
router.post(
  '/test',
  requirePermission('settings.manage'),
  smsTestLimiter,
  asyncHandler(async (req, res) => {
    const body = SendTestSms.parse({
      ...req.body,
      toNumber: normalizePhoneInput(req.body?.toNumber),
    });
    const result = await smsGatewayService.sendTestSms(body);
    res.json(result);
  })
);

// POST /api/v1/admin/sms-gateways/test-whatsapp
router.post(
  '/test-whatsapp',
  requirePermission('settings.manage'),
  smsTestLimiter,
  asyncHandler(async (req, res) => {
    const body = SendTestWhatsapp.parse({
      ...req.body,
      toNumber: normalizePhoneInput(req.body?.toNumber),
    });
    const result = await smsGatewayService.sendTestWhatsapp(body);
    res.json(result);
  })
);

export default router;
