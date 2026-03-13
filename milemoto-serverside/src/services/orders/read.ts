import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { orderitems, orders, orderstatushistory, ordertaxlines } from '@milemoto/types';
import type {
  AdminOrderDetailResponse,
  AdminOrdersListQueryDto,
  AdminOrdersListResponse,
  CustomerOrderDetailResponse,
  CustomerOrdersListQueryDto,
  CustomerOrdersListResponse,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

type OrderStatusValue = (typeof orders)['$inferSelect']['status'];
type OrderPaymentStatusValue = (typeof orders)['$inferSelect']['paymentStatus'];

export async function listCustomerOrders(
  userId: number,
  query: CustomerOrdersListQueryDto
): Promise<CustomerOrdersListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;

  const where = and(
    eq(orders.userId, userId),
    query.status ? eq(orders.status, query.status as OrderStatusValue) : undefined
  );

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        grandTotal: orders.grandTotal,
        currency: orders.currency,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
        imageSrc: sql<string | null>`(
          SELECT ${orderitems.imageSrc}
          FROM ${orderitems}
          WHERE ${orderitems.orderId} = ${orders.id}
            AND ${orderitems.imageSrc} IS NOT NULL
          ORDER BY ${orderitems.id} ASC
          LIMIT 1
        )`,
        itemCount: sql<number>`(
          SELECT COALESCE(SUM(${orderitems.quantity}), 0)
          FROM ${orderitems}
          WHERE ${orderitems.orderId} = ${orders.id}
        )`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      imageSrc: row.imageSrc ?? null,
      itemCount: Number(row.itemCount ?? 0),
      grandTotal: Number(row.grandTotal),
      currency: row.currency,
      placedAt: new Date(row.placedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function getCustomerOrderById(
  userId: number,
  orderId: number
): Promise<CustomerOrderDetailResponse> {
  const [header] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!header) {
    throw httpError(404, 'OrderNotFound', 'Order not found');
  }

  const [items, history, taxLines] = await Promise.all([
    db.select().from(orderitems).where(eq(orderitems.orderId, orderId)),
    db
      .select()
      .from(orderstatushistory)
      .where(eq(orderstatushistory.orderId, orderId))
      .orderBy(desc(orderstatushistory.createdAt)),
    db
      .select()
      .from(ordertaxlines)
      .where(eq(ordertaxlines.orderId, orderId))
      .orderBy(desc(ordertaxlines.createdAt)),
  ]);

  return {
    id: header.id,
    orderNumber: header.orderNumber,
    status: header.status,
    paymentMethod: header.paymentMethod,
    paymentStatus: header.paymentStatus,
    currency: header.currency,
    subtotal: Number(header.subtotal),
    discountTotal: Number(header.discountTotal),
    shippingTotal: Number(header.shippingTotal),
    taxTotal: Number(header.taxTotal),
    grandTotal: Number(header.grandTotal),
    notes: header.notes ?? null,
    shippingAddress: {
      fullName: header.shippingFullName,
      phone: header.shippingPhone,
      email: header.shippingEmail ?? null,
      country: header.shippingCountry,
      state: header.shippingState,
      city: header.shippingCity,
      addressLine1: header.shippingAddressLine1,
      addressLine2: header.shippingAddressLine2 ?? null,
      postalCode: header.shippingPostalCode ?? null,
    },
    billingAddress: {
      fullName: header.billingFullName,
      phone: header.billingPhone,
      email: header.billingEmail ?? null,
      country: header.billingCountry,
      state: header.billingState,
      city: header.billingCity,
      addressLine1: header.billingAddressLine1,
      addressLine2: header.billingAddressLine2 ?? null,
      postalCode: header.billingPostalCode ?? null,
    },
    items: items.map((row) => ({
      id: row.id,
      productId: row.productId,
      productVariantId: row.productVariantId,
      sku: row.sku ?? null,
      productName: row.productName,
      variantName: row.variantName ?? null,
      imageSrc: row.imageSrc ?? null,
      unitPrice: Number(row.unitPrice),
      quantity: row.quantity,
      lineTotal: Number(row.lineTotal),
    })),
    taxLines: taxLines.map((row) => ({
      id: row.id,
      taxId: row.taxId ?? null,
      taxName: row.taxName,
      taxType: row.taxType,
      taxRate: Number(row.taxRate),
      countryId: row.countryId ?? null,
      amount: Number(row.amount),
    })),
    statusHistory: history.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus ?? null,
      toStatus: row.toStatus,
      reason: row.reason ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    placedAt: new Date(header.placedAt).toISOString(),
    createdAt: new Date(header.createdAt).toISOString(),
    updatedAt: new Date(header.updatedAt).toISOString(),
  };
}

export async function listAdminOrders(
  query: AdminOrdersListQueryDto
): Promise<AdminOrdersListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const filterMode = query.filterMode ?? 'all';
  const sortBy = query.sortBy ?? 'createdAt';
  const sortDir = query.sortDir ?? 'desc';

  const searchFilter = search
    ? or(
        like(orders.orderNumber, `%${search}%`),
        like(orders.shippingFullName, `%${search}%`),
        like(orders.shippingPhone, `%${search}%`)
      )
    : undefined;
  const optionalFilters = [
    query.status ? eq(orders.status, query.status as OrderStatusValue) : undefined,
    query.paymentStatus
      ? eq(orders.paymentStatus, query.paymentStatus as OrderPaymentStatusValue)
      : undefined,
    query.paymentMethod ? eq(orders.paymentMethod, query.paymentMethod) : undefined,
    query.dateFrom ? gte(orders.placedAt, new Date(query.dateFrom)) : undefined,
    query.dateTo ? lte(orders.placedAt, new Date(query.dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];
  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const itemCountExpr = sql<number>`(
    SELECT COALESCE(SUM(${orderitems.quantity}), 0)
    FROM ${orderitems}
    WHERE ${orderitems.orderId} = ${orders.id}
  )`;
  const sortColumn =
    sortBy === 'orderNumber'
      ? orders.orderNumber
      : sortBy === 'customerName'
        ? orders.shippingFullName
        : sortBy === 'status'
          ? orders.status
          : sortBy === 'paymentStatus'
            ? orders.paymentStatus
            : sortBy === 'paymentMethod'
              ? orders.paymentMethod
              : sortBy === 'itemCount'
                ? itemCountExpr
                : sortBy === 'placedAt'
                  ? orders.placedAt
                  : sortBy === 'grandTotal'
                    ? orders.grandTotal
                    : orders.createdAt;
  const orderByClause = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const orderById = sortDir === 'asc' ? asc(orders.id) : desc(orders.id);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        userId: orders.userId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        grandTotal: orders.grandTotal,
        currency: orders.currency,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
        customerName: orders.shippingFullName,
        customerPhone: orders.shippingPhone,
        itemCount: itemCountExpr,
      })
      .from(orders)
      .where(where)
      .orderBy(orderByClause, orderById)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      itemCount: Number(row.itemCount ?? 0),
      grandTotal: Number(row.grandTotal),
      currency: row.currency,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      placedAt: new Date(row.placedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminOrderFilterOptions() {
  const paymentMethodRows = await db
    .selectDistinct({ paymentMethod: orders.paymentMethod })
    .from(orders)
    .orderBy(asc(orders.paymentMethod));

  return {
    paymentMethods: paymentMethodRows
      .map(row => row.paymentMethod)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
  };
}

export async function getAdminOrderById(orderId: number): Promise<AdminOrderDetailResponse> {
  const [header] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!header) {
    throw httpError(404, 'OrderNotFound', 'Order not found');
  }

  const [items, history, taxLines] = await Promise.all([
    db.select().from(orderitems).where(eq(orderitems.orderId, orderId)),
    db
      .select()
      .from(orderstatushistory)
      .where(eq(orderstatushistory.orderId, orderId))
      .orderBy(desc(orderstatushistory.createdAt)),
    db
      .select()
      .from(ordertaxlines)
      .where(eq(ordertaxlines.orderId, orderId))
      .orderBy(desc(ordertaxlines.createdAt)),
  ]);

  return {
    id: header.id,
    userId: header.userId,
    orderNumber: header.orderNumber,
    status: header.status,
    paymentMethod: header.paymentMethod,
    paymentStatus: header.paymentStatus,
    currency: header.currency,
    subtotal: Number(header.subtotal),
    discountTotal: Number(header.discountTotal),
    shippingTotal: Number(header.shippingTotal),
    taxTotal: Number(header.taxTotal),
    grandTotal: Number(header.grandTotal),
    notes: header.notes ?? null,
    shippingAddress: {
      fullName: header.shippingFullName,
      phone: header.shippingPhone,
      email: header.shippingEmail ?? null,
      country: header.shippingCountry,
      state: header.shippingState,
      city: header.shippingCity,
      addressLine1: header.shippingAddressLine1,
      addressLine2: header.shippingAddressLine2 ?? null,
      postalCode: header.shippingPostalCode ?? null,
    },
    billingAddress: {
      fullName: header.billingFullName,
      phone: header.billingPhone,
      email: header.billingEmail ?? null,
      country: header.billingCountry,
      state: header.billingState,
      city: header.billingCity,
      addressLine1: header.billingAddressLine1,
      addressLine2: header.billingAddressLine2 ?? null,
      postalCode: header.billingPostalCode ?? null,
    },
    items: items.map((row) => ({
      id: row.id,
      productId: row.productId,
      productVariantId: row.productVariantId,
      sku: row.sku ?? null,
      productName: row.productName,
      variantName: row.variantName ?? null,
      imageSrc: row.imageSrc ?? null,
      unitPrice: Number(row.unitPrice),
      quantity: row.quantity,
      lineTotal: Number(row.lineTotal),
    })),
    taxLines: taxLines.map((row) => ({
      id: row.id,
      taxId: row.taxId ?? null,
      taxName: row.taxName,
      taxType: row.taxType,
      taxRate: Number(row.taxRate),
      countryId: row.countryId ?? null,
      amount: Number(row.amount),
    })),
    statusHistory: history.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus ?? null,
      toStatus: row.toStatus,
      reason: row.reason ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    placedAt: new Date(header.placedAt).toISOString(),
    createdAt: new Date(header.createdAt).toISOString(),
    updatedAt: new Date(header.updatedAt).toISOString(),
  };
}
