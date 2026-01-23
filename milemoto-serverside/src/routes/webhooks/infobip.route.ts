import { Router } from 'express';
import crypto from 'crypto';
import { storeInfobipDeliveryReport } from '../../services/sms/infobipDeliveryReports.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';

const router = Router();

function timingSafeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyInfobipSignature(req: { rawBody?: string; headers: Record<string, unknown> }) {
  const secret = env.INFOBIP_WEBHOOK_SECRET;
  if (!secret) {
    throw httpError(
      500,
      'WebhookSecretMissing',
      'Infobip webhook secret is not configured. Set INFOBIP_WEBHOOK_SECRET.'
    );
  }

  const header =
    (req.headers['x-infobip-signature-256'] as string | undefined) ||
    (req.headers['x-infobip-signature'] as string | undefined) ||
    '';
  const signature = header.replace(/^sha256=/i, '').trim();
  if (!signature) {
    throw httpError(401, 'WebhookSignatureMissing', 'Missing Infobip signature header.');
  }

  const payload = req.rawBody ?? '';
  const digest = crypto.createHmac('sha256', secret).update(payload).digest();
  const hex = digest.toString('hex');
  const base64 = digest.toString('base64');

  if (!timingSafeEquals(signature, hex) && !timingSafeEquals(signature, base64)) {
    throw httpError(401, 'WebhookSignatureInvalid', 'Invalid webhook signature.');
  }
}

// POST /api/v1/webhooks/infobip/sms/delivery
router.post('/sms/delivery', async (req, res, next) => {
  try {
    verifyInfobipSignature(req);
    const result = await storeInfobipDeliveryReport(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
