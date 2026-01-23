import { and, asc, eq, like, sql } from 'drizzle-orm';
import { paymentmethods } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/paymentMethod.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatPaymentMethodRow } from './shared.js';

export async function listPaymentMethods(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search ? like(paymentmethods.name, `%${search}%`) : undefined,
    status ? eq(paymentmethods.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(paymentmethods)
      .where(where)
      .orderBy(asc(paymentmethods.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(paymentmethods)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatPaymentMethodRow),
    totalCount: total,
    page,
    limit,
  });
}

export async function getPaymentMethod(id: number) {
  const rows = await db.select().from(paymentmethods).where(eq(paymentmethods.id, id)).limit(1);

  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Payment method not found');
  }

  return formatPaymentMethodRow(rows[0]);
}
