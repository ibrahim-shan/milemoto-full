import { eq, sql, and } from 'drizzle-orm';
import {
  orderitems,
  orders,
  orderstatushistory,
  stocklevels,
  stockmovements,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { ensureInvoiceForOrder } from '../invoice/write.js';
import { getInvoicePolicySettings } from '../siteSettings/read.js';

type OrderStatus = (typeof orders)['$inferSelect']['status'];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type LockedStockRow = {
  id: number;
  stockLocationId: number;
  onHand: number;
  allocated: number;
};

function rowsFromResult<T>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length === 0) return [];
    const first = result[0];
    if (Array.isArray(first)) return first as T[];
    return result as T[];
  }
  if (typeof result === 'object' && 'rows' in (result as object)) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

async function lockVariantStockRows(tx: Tx, variantId: number) {
  const lockResult = await tx.execute(
    sql`SELECT id, stockLocationId, onHand, allocated FROM stocklevels WHERE productVariantId = ${variantId} FOR UPDATE`
  );
  return rowsFromResult<LockedStockRow>(lockResult).map((r) => ({
    id: Number(r.id),
    stockLocationId: Number(r.stockLocationId),
    onHand: Number(r.onHand),
    allocated: Number(r.allocated),
  }));
}

async function releaseReservedStock(tx: Tx, orderId: number) {
  const lines = await tx
    .select({
      productVariantId: orderitems.productVariantId,
      quantity: orderitems.quantity,
      variantName: orderitems.variantName,
    })
    .from(orderitems)
    .where(eq(orderitems.orderId, orderId));

  for (const line of lines) {
    let remaining = Number(line.quantity);
    const rows = (await lockVariantStockRows(tx, Number(line.productVariantId))).sort(
      (a, b) => b.allocated - a.allocated
    );

    for (const row of rows) {
      if (remaining <= 0) break;
      if (row.allocated <= 0) continue;
      const take = Math.min(remaining, row.allocated);
      await tx
        .update(stocklevels)
        .set({ allocated: row.allocated - take })
        .where(eq(stocklevels.id, row.id));
      row.allocated -= take;
      remaining -= take;
    }

    if (remaining > 0) {
      throw httpError(
        409,
        'StockReservationMismatch',
        `Order reservation mismatch for ${line.variantName ?? 'variant'}`
      );
    }
  }
}

async function shipReservedStock(
  tx: Tx,
  orderId: number,
  actorUserId: number,
  orderNumber: string
) {
  const lines = await tx
    .select({
      productVariantId: orderitems.productVariantId,
      quantity: orderitems.quantity,
      variantName: orderitems.variantName,
    })
    .from(orderitems)
    .where(eq(orderitems.orderId, orderId));

  for (const line of lines) {
    let remaining = Number(line.quantity);
    const rows = (await lockVariantStockRows(tx, Number(line.productVariantId))).sort(
      (a, b) => b.allocated - a.allocated
    );

    for (const row of rows) {
      if (remaining <= 0) break;
      if (row.allocated <= 0) continue;

      const take = Math.min(remaining, row.allocated);
      if (row.onHand < take) {
        throw httpError(
          409,
          'StockOnHandMismatch',
          `Stock on hand mismatch for ${line.variantName ?? 'variant'}`
        );
      }

      await tx
        .update(stocklevels)
        .set({
          allocated: row.allocated - take,
          onHand: row.onHand - take,
        })
        .where(eq(stocklevels.id, row.id));

      await tx.insert(stockmovements).values({
        productVariantId: Number(line.productVariantId),
        stockLocationId: row.stockLocationId,
        performedByUserId: actorUserId,
        quantity: -take,
        type: 'sale_shipment',
        referenceType: 'customer_order',
        referenceId: orderId,
        note: `Order shipped: ${orderNumber}`,
      });

      row.allocated -= take;
      row.onHand -= take;
      remaining -= take;
    }

    if (remaining > 0) {
      throw httpError(
        409,
        'StockReservationMismatch',
        `Order reservation mismatch for ${line.variantName ?? 'variant'}`
      );
    }
  }
}

function assertTransitionAllowed(from: OrderStatus, to: OrderStatus) {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    pending_confirmation: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };
  return allowed[from].includes(to);
}

export async function transitionAdminOrderStatus(input: {
  orderId: number;
  toStatus: OrderStatus;
  actorUserId: number;
  reason?: string | null;
  tx?: Tx;
}) {
  const { orderId, toStatus, actorUserId, reason, tx: existingTx } = input;
  const run = async (tx: Tx) => {
    const [current] = await tx
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!current) {
      throw httpError(404, 'OrderNotFound', 'Order not found');
    }

    const fromStatus = current.status;
    if (fromStatus === toStatus) {
      return { idempotent: true, orderId: current.id };
    }

    if (!assertTransitionAllowed(fromStatus, toStatus)) {
      throw httpError(
        409,
        'InvalidOrderTransition',
        `Cannot move order from ${fromStatus} to ${toStatus}`
      );
    }

    if (toStatus === 'cancelled') {
      await releaseReservedStock(tx, orderId);
    } else if (toStatus === 'shipped') {
      await shipReservedStock(tx, orderId, actorUserId, current.orderNumber);
    }

    await tx.update(orders).set({ status: toStatus }).where(eq(orders.id, orderId));
    await tx.insert(orderstatushistory).values({
      orderId,
      fromStatus,
      toStatus,
      reason: reason ?? null,
      actorUserId,
    });

    if (toStatus === 'delivered') {
      const invoicePolicy = await getInvoicePolicySettings();
      const shouldGenerateOnDelivered =
        invoicePolicy.autoGenerateTrigger === 'delivered' ||
        (invoicePolicy.autoGenerateTrigger === 'payment_confirmed' &&
          current.paymentStatus === 'paid');
      if (invoicePolicy.autoGenerateEnabled && shouldGenerateOnDelivered) {
        await ensureInvoiceForOrder({
          tx,
          orderId,
          createdByUserId: actorUserId,
          status: 'issued',
        });
      }
    }

    return { idempotent: false, orderId: current.id };
  };

  if (existingTx) {
    return run(existingTx);
  }

  return db.transaction(run);
}

export async function confirmAdminOrder(
  orderId: number,
  actorUserId: number,
  reason?: string | null
) {
  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'confirmed',
    actorUserId,
    ...(reason !== undefined ? { reason } : {}),
  });
}

export async function processAdminOrder(
  orderId: number,
  actorUserId: number,
  reason?: string | null
) {
  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'processing',
    actorUserId,
    ...(reason !== undefined ? { reason } : {}),
  });
}

export async function shipAdminOrder(orderId: number, actorUserId: number, reason?: string | null) {
  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'shipped',
    actorUserId,
    ...(reason !== undefined ? { reason } : {}),
  });
}

export async function deliverAdminOrder(
  orderId: number,
  actorUserId: number,
  reason?: string | null
) {
  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'delivered',
    actorUserId,
    ...(reason !== undefined ? { reason } : {}),
  });
}

export async function cancelAdminOrder(
  orderId: number,
  actorUserId: number,
  reason?: string | null
) {
  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'cancelled',
    actorUserId,
    ...(reason !== undefined ? { reason } : {}),
  });
}

export async function cancelCustomerOrder(userId: number, orderId: number, reason?: string | null) {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw httpError(404, 'OrderNotFound', 'Order not found');
  }

  return transitionAdminOrderStatus({
    orderId,
    toStatus: 'cancelled',
    actorUserId: userId,
    ...(reason !== undefined ? { reason } : {}),
  });
}
