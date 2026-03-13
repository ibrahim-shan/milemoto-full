import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getAdminInvoiceById, listAdminInvoices } from '../../services/invoice/read.js';
import { getAdminInvoicePdf } from '../../services/invoice/pdf.js';
import { createInvoiceFromOrder } from '../../services/invoice/write.js';
import { httpError } from '../../utils/error.js';
import { CreateFromOrderInput, ListQuery } from './helpers/invoice.helpers.js';

const invoiceAdmin = Router();

invoiceAdmin.get(
  '/',
  requirePermission('invoices.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listAdminInvoices(query);
    res.json(result);
  })
);

invoiceAdmin.get(
  '/:id/pdf',
  requirePermission('invoices.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const { filename, buffer } = await getAdminInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

invoiceAdmin.get(
  '/:id',
  requirePermission('invoices.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getAdminInvoiceById(id);
    res.json(result);
  })
);

invoiceAdmin.post(
  '/from-order/:orderId',
  requirePermission('invoices.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const orderId = z.coerce.number().int().min(1).parse(req.params.orderId);
    const body = CreateFromOrderInput.parse(req.body ?? {});
    const result = await createInvoiceFromOrder(orderId, Number(req.user.id), body);
    res.status(201).json(result);
  })
);

export default invoiceAdmin;
