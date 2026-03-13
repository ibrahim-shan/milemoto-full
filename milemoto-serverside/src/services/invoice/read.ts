import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { invoices, orderitems, orders, ordertaxlines } from '@milemoto/types';
import type {
  AdminInvoiceDetailResponse,
  AdminInvoiceListItem,
  AdminInvoicesListQueryDto,
  AdminInvoicesListResponse,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapListRow(row: {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  customerPhone: string;
  status: string;
  currency: string;
  grandTotal: number;
  issuedAt: Date | string;
  dueAt: Date | string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): AdminInvoiceListItem {
  return {
    id: Number(row.id),
    invoiceNumber: row.invoiceNumber,
    orderId: Number(row.orderId),
    orderNumber: row.orderNumber,
    userId: Number(row.userId),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    status: row.status as AdminInvoiceListItem['status'],
    currency: row.currency,
    grandTotal: Number(row.grandTotal),
    issuedAt: toIso(row.issuedAt) || new Date().toISOString(),
    dueAt: toIso(row.dueAt),
    paidAt: toIso(row.paidAt),
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  };
}

export async function listAdminInvoices(
  query: AdminInvoicesListQueryDto
): Promise<AdminInvoicesListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const filterMode = query.filterMode ?? 'all';
  const sortBy = query.sortBy ?? 'createdAt';
  const sortDir = query.sortDir ?? 'desc';

  const searchFilter = search
    ? or(
        like(invoices.invoiceNumber, `%${search}%`),
        like(orders.orderNumber, `%${search}%`),
        like(orders.shippingFullName, `%${search}%`),
        like(orders.shippingPhone, `%${search}%`)
      )
    : undefined;
  const optionalFilters = [
    query.status ? eq(invoices.status, query.status) : undefined,
    query.dateFrom ? gte(invoices.issuedAt, new Date(query.dateFrom)) : undefined,
    query.dateTo ? lte(invoices.issuedAt, new Date(query.dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];
  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);

  const sortColumn =
    sortBy === 'invoiceNumber'
      ? invoices.invoiceNumber
      : sortBy === 'orderNumber'
        ? orders.orderNumber
        : sortBy === 'customerName'
          ? orders.shippingFullName
          : sortBy === 'status'
            ? invoices.status
            : sortBy === 'issuedAt'
              ? invoices.issuedAt
              : sortBy === 'grandTotal'
                ? invoices.grandTotal
                : invoices.createdAt;
  const orderByClause = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const orderById = sortDir === 'asc' ? asc(invoices.id) : desc(invoices.id);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        orderId: invoices.orderId,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        customerName: orders.shippingFullName,
        customerPhone: orders.shippingPhone,
        status: invoices.status,
        currency: invoices.currency,
        grandTotal: invoices.grandTotal,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .where(where)
      .orderBy(orderByClause, orderById)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map(mapListRow),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminInvoiceById(invoiceId: number): Promise<AdminInvoiceDetailResponse> {
  const [header] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      orderId: invoices.orderId,
      status: invoices.status,
      currency: invoices.currency,
      subtotal: invoices.subtotal,
      discountTotal: invoices.discountTotal,
      shippingTotal: invoices.shippingTotal,
      taxTotal: invoices.taxTotal,
      grandTotal: invoices.grandTotal,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      note: invoices.note,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      customerName: orders.shippingFullName,
      customerPhone: orders.shippingPhone,
      billingFullName: orders.billingFullName,
      billingPhone: orders.billingPhone,
      billingEmail: orders.billingEmail,
      billingCountry: orders.billingCountry,
      billingState: orders.billingState,
      billingCity: orders.billingCity,
      billingAddressLine1: orders.billingAddressLine1,
      billingAddressLine2: orders.billingAddressLine2,
      billingPostalCode: orders.billingPostalCode,
    })
    .from(invoices)
    .innerJoin(orders, eq(orders.id, invoices.orderId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!header) {
    throw httpError(404, 'InvoiceNotFound', 'Invoice not found');
  }

  const [items, taxLines] = await Promise.all([
    db.select().from(orderitems).where(eq(orderitems.orderId, Number(header.orderId))),
    db.select().from(ordertaxlines).where(eq(ordertaxlines.orderId, Number(header.orderId))),
  ]);

  return {
    ...mapListRow({
      id: Number(header.id),
      invoiceNumber: header.invoiceNumber,
      orderId: Number(header.orderId),
      orderNumber: header.orderNumber,
      userId: Number(header.userId),
      customerName: header.customerName,
      customerPhone: header.customerPhone,
      status: header.status,
      currency: header.currency,
      grandTotal: Number(header.grandTotal),
      issuedAt: header.issuedAt,
      dueAt: header.dueAt,
      paidAt: header.paidAt,
      createdAt: header.createdAt,
      updatedAt: header.updatedAt,
    }),
    subtotal: Number(header.subtotal),
    discountTotal: Number(header.discountTotal),
    shippingTotal: Number(header.shippingTotal),
    taxTotal: Number(header.taxTotal),
    note: header.note ?? null,
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
  };
}

