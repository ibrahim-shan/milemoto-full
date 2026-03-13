import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import {
  orderitems,
  orders,
  orderrequests,
  orderstatushistory,
  stocklevels,
  stocklocations,
  stockmovements,
} from '@milemoto/types';
import type {
  AdminOrderRequestItem,
  AdminOrderRequestsListQueryDto,
  AdminOrderRequestsListResponse,
  CompleteOrderRequestDto,
  CreateOrderRequestDto,
  CustomerOrderRequestsListQueryDto,
  CustomerOrderRequestsListResponse,
  DecideOrderRequestDto,
  OrderRequestItem,
  OrderRequestType,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { transitionAdminOrderStatus } from './write.js';
import { logAuditEvent } from '../auditLog.service.js';
import { getOrderRequestPolicySettings } from '../siteSettings/read.js';

type OrderStatus = (typeof orders)['$inferSelect']['status'];
type OrderRequestStatus = (typeof orderrequests)['$inferSelect']['status'];
type OrderPaymentStatus = (typeof orders)['$inferSelect']['paymentStatus'];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AuditContext {
  userId: number;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

const ACTIVE_REQUEST_STATUSES: OrderRequestStatus[] = ['pending', 'approved'];

const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  'pending_confirmation',
  'confirmed',
  'processing',
];
const REFUNDABLE_PAYMENT_STATUSES: OrderPaymentStatus[] = ['paid', 'partially_refunded'];
const REFUND_COMPLETION_TARGET_STATUSES: OrderPaymentStatus[] = ['refunded', 'partially_refunded'];

type LockedStockLevelRow = {
  id: number;
  onHand: number;
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

const REQUEST_ALLOWED_STATUS_TRANSITIONS: Record<
  OrderRequestStatus,
  readonly OrderRequestStatus[]
> = {
  pending: ['approved', 'rejected', 'cancelled_by_user'],
  approved: ['completed'],
  rejected: [],
  completed: [],
  cancelled_by_user: [],
};

function assertRequestStatusTransitionAllowed(from: OrderRequestStatus, to: OrderRequestStatus) {
  if (from === to) return;
  const allowed = REQUEST_ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw httpError(
      409,
      'OrderRequestInvalidState',
      `Invalid request transition: ${from} -> ${to}`
    );
  }
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapRequestRow(row: {
  id: number;
  orderId: number;
  userId: number;
  type: string;
  status: string;
  reason: string | null;
  adminNote: string | null;
  metadataJson: string | null;
  requestedAt: Date | string;
  decidedAt: Date | string | null;
  completedAt: Date | string | null;
  decidedByUserId: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): OrderRequestItem {
  return {
    id: Number(row.id),
    orderId: Number(row.orderId),
    userId: Number(row.userId),
    type: row.type as OrderRequestItem['type'],
    status: row.status as OrderRequestItem['status'],
    reason: row.reason ?? null,
    adminNote: row.adminNote ?? null,
    metadataJson: row.metadataJson ?? null,
    requestedAt: toIso(row.requestedAt) || new Date().toISOString(),
    decidedAt: toIso(row.decidedAt),
    completedAt: toIso(row.completedAt),
    decidedByUserId: row.decidedByUserId ?? null,
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  };
}

function mapAdminRequestRow(row: {
  id: number;
  orderId: number;
  userId: number;
  type: string;
  status: string;
  reason: string | null;
  adminNote: string | null;
  metadataJson: string | null;
  requestedAt: Date | string;
  decidedAt: Date | string | null;
  completedAt: Date | string | null;
  decidedByUserId: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
}): AdminOrderRequestItem {
  return {
    ...mapRequestRow(row),
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  };
}

async function getOwnedOrder(userId: number, orderId: number) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      updatedAt: orders.updatedAt,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) throw httpError(404, 'OrderNotFound', 'Order not found');
  return order;
}

async function getOwnedOrderForUpdate(tx: Tx, userId: number, orderId: number) {
  const lockResult = await tx.execute(
    sql`SELECT id, status, updatedAt, placedAt FROM orders WHERE id = ${orderId} AND userId = ${userId} FOR UPDATE`
  );
  const [order] = rowsFromResult<{
    id: number;
    status: OrderStatus;
    updatedAt: Date | string;
    placedAt: Date | string;
  }>(lockResult);
  if (!order) throw httpError(404, 'OrderNotFound', 'Order not found');
  return order;
}

async function getReturnRefundWindowAnchorForOrder(
  orderId: number,
  placedAt: Date | string
): Promise<Date> {
  const [deliveredEntry] = await db
    .select({ createdAt: orderstatushistory.createdAt })
    .from(orderstatushistory)
    .where(
      and(eq(orderstatushistory.orderId, orderId), eq(orderstatushistory.toStatus, 'delivered'))
    )
    .orderBy(desc(orderstatushistory.createdAt), desc(orderstatushistory.id))
    .limit(1);

  if (deliveredEntry?.createdAt) return new Date(deliveredEntry.createdAt);

  const [shippedEntry] = await db
    .select({ createdAt: orderstatushistory.createdAt })
    .from(orderstatushistory)
    .where(and(eq(orderstatushistory.orderId, orderId), eq(orderstatushistory.toStatus, 'shipped')))
    .orderBy(desc(orderstatushistory.createdAt), desc(orderstatushistory.id))
    .limit(1);

  if (shippedEntry?.createdAt) return new Date(shippedEntry.createdAt);

  return new Date(placedAt);
}

function assertWithinPolicyWindow(
  deliveredAt: Date,
  windowDays: number,
  label: 'return' | 'refund'
): void {
  if (windowDays <= 0) return;
  const cutoff = new Date(deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
  if (new Date() <= cutoff) return;
  throw httpError(
    409,
    'OrderRequestWindowExpired',
    `${label === 'return' ? 'Return' : 'Refund'} request window expired (${windowDays} day(s)).`
  );
}

function assertRefundCompletionAllowed(
  currentPaymentStatus: OrderPaymentStatus,
  targetPaymentStatus: OrderPaymentStatus
) {
  if (!REFUND_COMPLETION_TARGET_STATUSES.includes(targetPaymentStatus)) {
    throw httpError(
      400,
      'InvalidRefundPaymentStatus',
      'Refund completion payment status must be refunded or partially_refunded.'
    );
  }

  if (!REFUNDABLE_PAYMENT_STATUSES.includes(currentPaymentStatus)) {
    throw httpError(
      409,
      'RefundNotAllowed',
      `Cannot complete refund for order with payment status '${currentPaymentStatus}'.`
    );
  }
}

async function resolveReturnRestockLocationId(
  tx: Tx,
  defaultLocationId: number,
  preferredLocationId?: number | null
): Promise<number> {
  const candidateId =
    preferredLocationId && preferredLocationId > 0
      ? preferredLocationId
      : defaultLocationId > 0
        ? defaultLocationId
        : null;

  if (candidateId) {
    const [explicit] = await tx
      .select({ id: stocklocations.id })
      .from(stocklocations)
      .where(and(eq(stocklocations.id, candidateId), eq(stocklocations.status, 'active')))
      .limit(1);
    if (!explicit) {
      throw httpError(
        400,
        'InvalidRestockLocation',
        `Restock location ${candidateId} not found or inactive.`
      );
    }
    return Number(explicit.id);
  }

  const [fallback] = await tx
    .select({ id: stocklocations.id })
    .from(stocklocations)
    .where(eq(stocklocations.status, 'active'))
    .orderBy(stocklocations.id)
    .limit(1);

  if (!fallback) {
    throw httpError(
      409,
      'StockLocationNotConfigured',
      'No active stock location for return restock.'
    );
  }

  return Number(fallback.id);
}

async function applyReturnStockRestock(input: {
  tx: Tx;
  orderId: number;
  requestId: number;
  actorUserId: number;
  orderNumber: string;
  stockLocationId: number;
}) {
  const { tx, orderId, requestId, actorUserId, orderNumber, stockLocationId } = input;
  const lines = await tx
    .select({
      productVariantId: orderitems.productVariantId,
      quantity: orderitems.quantity,
      variantName: orderitems.variantName,
    })
    .from(orderitems)
    .where(eq(orderitems.orderId, orderId));

  for (const line of lines) {
    const variantId = Number(line.productVariantId);
    const qty = Number(line.quantity);
    if (qty <= 0) continue;

    const lockResult = await tx.execute(
      sql`SELECT id, onHand FROM stocklevels WHERE productVariantId = ${variantId} AND stockLocationId = ${stockLocationId} FOR UPDATE`
    );
    const [locked] = rowsFromResult<LockedStockLevelRow>(lockResult);

    if (locked?.id) {
      await tx
        .update(stocklevels)
        .set({
          onHand: Number(locked.onHand) + qty,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(stocklevels.id, Number(locked.id)));
    } else {
      await tx.insert(stocklevels).values({
        productVariantId: variantId,
        stockLocationId,
        onHand: qty,
        allocated: 0,
        onOrder: 0,
      });
    }

    await tx.insert(stockmovements).values({
      productVariantId: variantId,
      stockLocationId,
      performedByUserId: actorUserId,
      quantity: qty,
      type: 'adjustment',
      referenceType: 'order_request_return',
      referenceId: requestId,
      note: `Return completed for order ${orderNumber} (request #${requestId})${line.variantName ? ` - ${line.variantName}` : ''}`,
    });
  }
}

async function assertTypeAllowedForOrder(
  type: OrderRequestType,
  order: { id: number; status: OrderStatus; updatedAt: Date | string; placedAt: Date | string },
  policy: { returnWindowDays: number; refundWindowDays: number }
) {
  if (type === 'cancel') {
    if (CANCELLABLE_ORDER_STATUSES.includes(order.status)) return;
    throw httpError(
      409,
      'OrderRequestNotAllowed',
      'Cancel request is allowed only before shipment.'
    );
  }

  if (order.status !== 'delivered') {
    throw httpError(
      409,
      'OrderRequestNotAllowed',
      `${type === 'return' ? 'Return' : 'Refund'} request is allowed only after delivery.`
    );
  }

  const deliveredAt = await getReturnRefundWindowAnchorForOrder(order.id, order.placedAt);
  const windowDays = type === 'return' ? policy.returnWindowDays : policy.refundWindowDays;
  assertWithinPolicyWindow(deliveredAt, windowDays, type);
}

async function ensureNoActiveRequestTx(
  tx: Tx,
  userId: number,
  orderId: number,
  type: OrderRequestType
) {
  const [existing] = await tx
    .select({ id: orderrequests.id })
    .from(orderrequests)
    .where(
      and(
        eq(orderrequests.userId, userId),
        eq(orderrequests.orderId, orderId),
        eq(orderrequests.type, type),
        or(...ACTIVE_REQUEST_STATUSES.map((status) => eq(orderrequests.status, status)))
      )
    )
    .limit(1);

  if (existing) {
    throw httpError(
      409,
      'OrderRequestAlreadyExists',
      'An active request of this type already exists for this order.'
    );
  }
}

async function getOrderRequestById(requestId: number) {
  const [row] = await db
    .select({
      id: orderrequests.id,
      orderId: orderrequests.orderId,
      userId: orderrequests.userId,
      type: orderrequests.type,
      status: orderrequests.status,
      reason: orderrequests.reason,
      adminNote: orderrequests.adminNote,
      metadataJson: orderrequests.metadataJson,
      requestedAt: orderrequests.requestedAt,
      decidedAt: orderrequests.decidedAt,
      completedAt: orderrequests.completedAt,
      decidedByUserId: orderrequests.decidedByUserId,
      createdAt: orderrequests.createdAt,
      updatedAt: orderrequests.updatedAt,
      orderNumber: orders.orderNumber,
      customerName: orders.shippingFullName,
      customerPhone: orders.shippingPhone,
    })
    .from(orderrequests)
    .innerJoin(orders, eq(orders.id, orderrequests.orderId))
    .where(eq(orderrequests.id, requestId))
    .limit(1);

  if (!row) throw httpError(404, 'OrderRequestNotFound', 'Order request not found');
  return row;
}

async function getOrderRequestByIdForUpdate(tx: Tx, requestId: number) {
  const lockResult = await tx.execute(sql`
    SELECT
      r.id,
      r.orderId,
      r.userId,
      r.type,
      r.status,
      r.reason,
      r.adminNote,
      r.metadataJson,
      r.requestedAt,
      r.decidedAt,
      r.completedAt,
      r.decidedByUserId,
      r.createdAt,
      r.updatedAt,
      o.orderNumber,
      o.shippingFullName AS customerName,
      o.shippingPhone AS customerPhone
    FROM orderrequests r
    INNER JOIN orders o ON o.id = r.orderId
    WHERE r.id = ${requestId}
    FOR UPDATE
  `);

  const [row] = rowsFromResult<{
    id: number;
    orderId: number;
    userId: number;
    type: string;
    status: string;
    reason: string | null;
    adminNote: string | null;
    metadataJson: string | null;
    requestedAt: Date | string;
    decidedAt: Date | string | null;
    completedAt: Date | string | null;
    decidedByUserId: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
  }>(lockResult);

  if (!row) throw httpError(404, 'OrderRequestNotFound', 'Order request not found');
  return row;
}

export async function createCustomerOrderRequest(
  userId: number,
  orderId: number,
  input: CreateOrderRequestDto,
  audit?: AuditContext
): Promise<OrderRequestItem> {
  const policy = await getOrderRequestPolicySettings();
  const created = await db.transaction(async (tx) => {
    // Lock order row so concurrent submits for the same order serialize.
    const order = await getOwnedOrderForUpdate(tx, userId, orderId);
    await assertTypeAllowedForOrder(input.type, order, policy);
    await ensureNoActiveRequestTx(tx, userId, orderId, input.type);

    await tx.insert(orderrequests).values({
      orderId,
      userId,
      type: input.type,
      status: 'pending',
      reason: input.reason.trim(),
      adminNote: null,
      metadataJson: input.metadataJson?.trim() || null,
      decidedAt: null,
      completedAt: null,
      decidedByUserId: null,
    });

    const [inserted] = await tx
      .select()
      .from(orderrequests)
      .where(
        and(
          eq(orderrequests.userId, userId),
          eq(orderrequests.orderId, orderId),
          eq(orderrequests.type, input.type)
        )
      )
      .orderBy(desc(orderrequests.id))
      .limit(1);

    if (!inserted) {
      throw httpError(500, 'InternalError', 'Failed to create order request');
    }

    return inserted;
  });

  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'create',
      entityType: 'order_requests',
      entityId: String(created.id),
      metadata: {
        orderId: created.orderId,
        type: created.type,
        toStatus: created.status,
        reason: created.reason,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return mapRequestRow({
    id: created.id,
    orderId: created.orderId,
    userId: created.userId,
    type: created.type,
    status: created.status,
    reason: created.reason,
    adminNote: created.adminNote,
    metadataJson: created.metadataJson,
    requestedAt: created.requestedAt,
    decidedAt: created.decidedAt,
    completedAt: created.completedAt,
    decidedByUserId: created.decidedByUserId,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}

export async function cancelCustomerOrderRequest(
  userId: number,
  requestId: number,
  reason?: string | null,
  audit?: AuditContext
): Promise<OrderRequestItem> {
  const { updated, fromStatus, orderId, type } = await db.transaction(async (tx) => {
    const request = await getOrderRequestByIdForUpdate(tx, requestId);
    if (Number(request.userId) !== userId) {
      throw httpError(404, 'OrderRequestNotFound', 'Order request not found');
    }

    const fromStatus = request.status as OrderRequestStatus;
    assertRequestStatusTransitionAllowed(fromStatus, 'cancelled_by_user');

    await tx
      .update(orderrequests)
      .set({
        status: 'cancelled_by_user',
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(orderrequests.id, requestId), eq(orderrequests.status, fromStatus)));

    const [updated] = await tx
      .select()
      .from(orderrequests)
      .where(eq(orderrequests.id, requestId))
      .limit(1);
    if (!updated) throw httpError(500, 'InternalError', 'Failed to cancel order request');
    if (updated.status !== 'cancelled_by_user') {
      throw httpError(
        409,
        'OrderRequestInvalidState',
        'Failed to cancel order request due to state change.'
      );
    }

    return {
      updated,
      fromStatus,
      orderId: Number(request.orderId),
      type: request.type,
    };
  });

  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'update',
      entityType: 'order_requests',
      entityId: String(requestId),
      metadata: {
        orderId,
        type,
        fromStatus,
        toStatus: 'cancelled_by_user',
        reason: reason ?? null,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return mapRequestRow(updated);
}

export async function listCustomerOrderRequestsForOrder(
  userId: number,
  orderId: number,
  query: CustomerOrderRequestsListQueryDto
): Promise<CustomerOrderRequestsListResponse> {
  await getOwnedOrder(userId, orderId);

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;

  const where = and(
    eq(orderrequests.userId, userId),
    eq(orderrequests.orderId, orderId),
    query.type ? eq(orderrequests.type, query.type) : undefined,
    query.status ? eq(orderrequests.status, query.status) : undefined
  );

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(orderrequests)
      .where(where)
      .orderBy(desc(orderrequests.requestedAt), desc(orderrequests.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderrequests)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map(mapRequestRow),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function listMyOrderRequests(
  userId: number,
  query: CustomerOrderRequestsListQueryDto
): Promise<CustomerOrderRequestsListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;

  const where = and(
    eq(orderrequests.userId, userId),
    query.orderId ? eq(orderrequests.orderId, query.orderId) : undefined,
    query.type ? eq(orderrequests.type, query.type) : undefined,
    query.status ? eq(orderrequests.status, query.status) : undefined
  );

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(orderrequests)
      .where(where)
      .orderBy(desc(orderrequests.requestedAt), desc(orderrequests.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderrequests)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map(mapRequestRow),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function listAdminOrderRequests(
  query: AdminOrderRequestsListQueryDto
): Promise<AdminOrderRequestsListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const filterMode = query.filterMode ?? 'all';
  const sortBy = query.sortBy ?? 'requestedAt';
  const sortDir = query.sortDir ?? 'desc';

  const searchFilter = search
    ? or(
        like(orders.orderNumber, `%${search}%`),
        like(orders.shippingFullName, `%${search}%`),
        like(orders.shippingPhone, `%${search}%`)
      )
    : undefined;
  const optionalFilters = [
    query.orderId ? eq(orderrequests.orderId, query.orderId) : undefined,
    query.type ? eq(orderrequests.type, query.type) : undefined,
    query.status ? eq(orderrequests.status, query.status) : undefined,
    query.onlyRequiresStockAction
      ? and(eq(orderrequests.type, 'return'), eq(orderrequests.status, 'approved'))
      : undefined,
    query.onlyRefundPendingCompletion
      ? and(eq(orderrequests.type, 'refund'), eq(orderrequests.status, 'approved'))
      : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];
  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const sortColumn =
    sortBy === 'id'
      ? orderrequests.id
      : sortBy === 'orderNumber'
        ? orders.orderNumber
        : sortBy === 'customerName'
          ? orders.shippingFullName
          : sortBy === 'status'
            ? orderrequests.status
            : orderrequests.requestedAt;
  const orderByClause = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const orderById = sortDir === 'asc' ? asc(orderrequests.id) : desc(orderrequests.id);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: orderrequests.id,
        orderId: orderrequests.orderId,
        userId: orderrequests.userId,
        type: orderrequests.type,
        status: orderrequests.status,
        reason: orderrequests.reason,
        adminNote: orderrequests.adminNote,
        metadataJson: orderrequests.metadataJson,
        requestedAt: orderrequests.requestedAt,
        decidedAt: orderrequests.decidedAt,
        completedAt: orderrequests.completedAt,
        decidedByUserId: orderrequests.decidedByUserId,
        createdAt: orderrequests.createdAt,
        updatedAt: orderrequests.updatedAt,
        orderNumber: orders.orderNumber,
        customerName: orders.shippingFullName,
        customerPhone: orders.shippingPhone,
      })
      .from(orderrequests)
      .innerJoin(orders, eq(orders.id, orderrequests.orderId))
      .where(where)
      .orderBy(orderByClause, orderById)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderrequests)
      .innerJoin(orders, eq(orders.id, orderrequests.orderId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map(mapAdminRequestRow),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminOrderRequestById(requestId: number): Promise<AdminOrderRequestItem> {
  const row = await getOrderRequestById(requestId);
  return mapAdminRequestRow(row);
}

export async function decideAdminOrderRequest(
  requestId: number,
  adminUserId: number,
  input: DecideOrderRequestDto,
  audit?: AuditContext
): Promise<AdminOrderRequestItem> {
  const { fromStatus, orderId, type } = await db.transaction(async (tx) => {
    const request = await getOrderRequestByIdForUpdate(tx, requestId);
    const fromStatus = request.status as OrderRequestStatus;
    assertRequestStatusTransitionAllowed(fromStatus, input.status);

    if (input.status === 'approved' && request.type === 'cancel') {
      await transitionAdminOrderStatus({
        orderId: Number(request.orderId),
        toStatus: 'cancelled',
        actorUserId: adminUserId,
        reason: `Approved cancel request #${requestId}`,
        tx,
      });
    }

    await tx
      .update(orderrequests)
      .set({
        status: input.status,
        adminNote: input.adminNote?.trim() || null,
        decidedAt: sql`CURRENT_TIMESTAMP`,
        decidedByUserId: adminUserId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(orderrequests.id, requestId), eq(orderrequests.status, fromStatus)));

    return {
      fromStatus,
      orderId: Number(request.orderId),
      type: request.type,
    };
  });

  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'update',
      entityType: 'order_requests',
      entityId: String(requestId),
      metadata: {
        orderId,
        type,
        fromStatus,
        toStatus: input.status,
        adminNote: input.adminNote ?? null,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return getAdminOrderRequestById(requestId);
}

export async function completeAdminOrderRequest(
  requestId: number,
  adminUserId: number,
  input: CompleteOrderRequestDto,
  audit?: AuditContext
): Promise<AdminOrderRequestItem> {
  const policy = await getOrderRequestPolicySettings();
  const { fromStatus, orderId, type } = await db.transaction(async (tx) => {
    const request = await getOrderRequestByIdForUpdate(tx, requestId);
    const fromStatus = request.status as OrderRequestStatus;
    if (fromStatus !== 'approved') {
      throw httpError(
        409,
        'OrderRequestInvalidState',
        `Only approved requests can be completed (current: ${fromStatus}).`
      );
    }
    assertRequestStatusTransitionAllowed(fromStatus, 'completed');

    if (request.type !== 'refund' && input.refundPaymentStatus) {
      throw httpError(
        400,
        'InvalidCompleteRequestInput',
        'refundPaymentStatus is only allowed for refund requests.'
      );
    }

    await tx
      .update(orderrequests)
      .set({
        status: 'completed',
        adminNote: input.adminNote?.trim() || request.adminNote || null,
        completedAt: sql`CURRENT_TIMESTAMP`,
        decidedByUserId: adminUserId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(orderrequests.id, requestId), eq(orderrequests.status, fromStatus)));

    if (request.type === 'refund') {
      const paymentStatus: OrderPaymentStatus = input.refundPaymentStatus || 'refunded';
      const lockResult = await tx.execute(
        sql`SELECT paymentStatus FROM orders WHERE id = ${Number(request.orderId)} FOR UPDATE`
      );
      const [lockedOrder] = rowsFromResult<{ paymentStatus: OrderPaymentStatus }>(lockResult);
      if (!lockedOrder) {
        throw httpError(404, 'OrderNotFound', 'Order not found');
      }
      assertRefundCompletionAllowed(lockedOrder.paymentStatus, paymentStatus);

      await tx
        .update(orders)
        .set({
          paymentStatus,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(orders.id, Number(request.orderId)));
    }

    if (request.type === 'return') {
      const restockLocationId = await resolveReturnRestockLocationId(
        tx,
        policy.returnRestockLocationId,
        input.returnStockLocationId
      );
      await applyReturnStockRestock({
        tx,
        orderId: Number(request.orderId),
        requestId,
        actorUserId: adminUserId,
        orderNumber: request.orderNumber,
        stockLocationId: restockLocationId,
      });
    }

    return {
      fromStatus,
      orderId: Number(request.orderId),
      type: request.type,
    };
  });

  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'update',
      entityType: 'order_requests',
      entityId: String(requestId),
      metadata: {
        orderId,
        type,
        fromStatus,
        toStatus: 'completed',
        adminNote: input.adminNote ?? null,
        refundPaymentStatus: input.refundPaymentStatus ?? null,
        returnStockLocationId: input.returnStockLocationId ?? null,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return getAdminOrderRequestById(requestId);
}
