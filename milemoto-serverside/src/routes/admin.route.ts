import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/authz.js';
import { persistRuntimeFlag, runtimeFlags } from '../config/runtime.js';
import { logger } from '../utils/logger.js';
import locationAdmin from './admin/location.route.js';
import companyAdmin from './admin/company.route.js';
import unitAdmin from './admin/unit.route.js';
import taxAdmin from './admin/tax.route.js';
import currencyAdmin from './admin/currency.route.js';
import shippingAdmin from './admin/shipping.route.js';
import languageAdmin from './admin/language.route.js';
import siteSettingsAdmin from './admin/siteSettings.route.js';
import mailAdmin from './admin/mail.route.js';
import smsGatewayAdmin from './admin/smsGateway.route.js';
import stockLocationAdmin from './admin/stockLocation.route.js';
import brandAdmin from './admin/brand.route.js';
import categoryAdmin from './admin/category.route.js';
import variantAdmin from './admin/variant.route.js';
import gradeAdmin from './admin/grade.route.js';
import customerAdmin from './admin/customer.route.js';
import warrantyAdmin from './admin/warranty.route.js';
import vendorAdmin from './admin/vendor.route.js';
import productAdmin from './admin/product.route.js';
import collectionAdmin from './admin/collection.route.js';
import purchaseOrderAdmin from './admin/purchaseOrder.route.js';
import goodsReceiptAdmin from './admin/goodsReceipt.route.js';
import stockAdmin from './admin/stock.route.js';
import paymentMethodAdmin from './admin/paymentMethod.route.js';
import inboundShippingMethodAdmin from './admin/inboundShippingMethod.route.js';
import rbacAdmin from './admin/rbac.route.js';
import usersAdmin from './admin/users.route.js';
import auditLogAdmin from './admin/auditLog.route.js';

export const admin = Router();
admin.use(requireAuth, requireRole('admin')); // all routes below require admin

admin.use('/locations', locationAdmin);
admin.use('/company', companyAdmin);
admin.use('/units', unitAdmin);
admin.use('/taxes', taxAdmin);
admin.use('/currencies', currencyAdmin);
admin.use('/shipping', shippingAdmin);
admin.use('/languages', languageAdmin);
admin.use('/site-settings', siteSettingsAdmin);
admin.use('/mail', mailAdmin);
admin.use('/sms-gateways', smsGatewayAdmin);
admin.use('/stock-locations', stockLocationAdmin);
admin.use('/brands', brandAdmin);
admin.use('/categories', categoryAdmin);
admin.use('/variants', variantAdmin);
admin.use('/grades', gradeAdmin);
admin.use('/customers', customerAdmin);
admin.use('/warranties', warrantyAdmin);
admin.use('/vendors', vendorAdmin);
admin.use('/products', productAdmin);
admin.use('/collections', collectionAdmin);
admin.use('/purchase-orders', purchaseOrderAdmin);
admin.use('/goods-receipts', goodsReceiptAdmin);
admin.use('/stock', stockAdmin);
admin.use('/payment-methods', paymentMethodAdmin);
admin.use('/inbound-shipping-methods', inboundShippingMethodAdmin);
admin.use('/rbac', rbacAdmin);
admin.use('/users', usersAdmin);
admin.use('/audit-logs', auditLogAdmin);

admin.get('/ping', (_req, res) => {
  res.json({ ok: true, scope: 'admin' });
});

// Runtime toggle: enforce trusted-device fingerprint for all users (admins are always enforced)
admin.get('/security/trusted-devices/fingerprint', (_req, res) => {
  res.json({
    enforceAll: runtimeFlags.trustedDeviceFpEnforceAll,
    enforceAdminsAlways: true,
  });
});

admin.post('/security/trusted-devices/fingerprint', async (req, res, next) => {
  try {
    const { enforceAll } = z.object({ enforceAll: z.boolean() }).parse(req.body ?? {});
    const before = runtimeFlags.trustedDeviceFpEnforceAll;
    await persistRuntimeFlag('trustedDeviceFpEnforceAll', enforceAll);
    try {
      const adminId = req.user ? String(req.user.id) : 'unknown';
      logger.info(
        { code: 'FingerprintPolicyToggled', adminId, before, after: enforceAll },
        'Updated trusted-device fingerprint policy'
      );
    } catch {}
    res.json({ ok: true, enforceAll });
  } catch (err) {
    next(err);
  }
});
