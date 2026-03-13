import { eq, sql } from 'drizzle-orm';
import { invoices, orders } from '@milemoto/types';
import type { AdminInvoiceDetailResponse, CreateInvoiceFromOrderDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { getAdminInvoiceById } from './read.js';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function buildInvoiceNumber(id: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(id).padStart(6, '0')}`;
}

export async function ensureInvoiceForOrder(input: {
  orderId: number;
  createdByUserId: number | null;
  status?: CreateInvoiceFromOrderDto['status'];
  dueDate?: string | null;
  note?: string | null;
  tx?: Tx;
}): Promise<number> {
  const { orderId, createdByUserId, status, dueDate, note, tx: existingTx } = input;
  const run = async (tx: Tx) => {
    const [existing] = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.orderId, orderId))
      .limit(1);

    if (existing?.id) {
      return Number(existing.id);
    }

    const [order] = await tx
      .select({
        id: orders.id,
        currency: orders.currency,
        subtotal: orders.subtotal,
        discountTotal: orders.discountTotal,
        shippingTotal: orders.shippingTotal,
        taxTotal: orders.taxTotal,
        grandTotal: orders.grandTotal,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw httpError(404, 'OrderNotFound', 'Order not found');
    }

    const dueAt = dueDate ? new Date(`${dueDate}T23:59:59.000Z`) : null;

    await tx.insert(invoices).values({
      invoiceNumber: `PENDING-${orderId}-${Date.now()}`,
      orderId: Number(order.id),
      status: status ?? 'issued',
      currency: order.currency,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      shippingTotal: Number(order.shippingTotal),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      issuedAt: new Date(),
      dueAt,
      paidAt: null,
      note: note?.trim() || null,
      createdByUserId,
    });

    const [inserted] = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.orderId, Number(order.id)))
      .limit(1);

    if (!inserted?.id) {
      throw httpError(500, 'InternalError', 'Failed to create invoice');
    }

    await tx
      .update(invoices)
      .set({
        invoiceNumber: buildInvoiceNumber(Number(inserted.id)),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(invoices.id, Number(inserted.id)));

    return Number(inserted.id);
  };

  if (existingTx) {
    return run(existingTx);
  }

  return db.transaction(run);
}

export async function createInvoiceFromOrder(
  orderId: number,
  adminUserId: number,
  input: CreateInvoiceFromOrderDto
): Promise<AdminInvoiceDetailResponse> {
  const invoiceId = await ensureInvoiceForOrder({
    orderId,
    createdByUserId: adminUserId,
    status: input.status,
    dueDate: input.dueDate ?? null,
    note: input.note ?? null,
  });

  return getAdminInvoiceById(invoiceId);
}
