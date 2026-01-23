import { and, asc, eq, like, ne, or, sql } from 'drizzle-orm';
import { users } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/customer.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatCustomerRow } from './shared.js';

export async function listCustomers(params: ListQueryDto) {
  const { page, limit, search, status, dateStart, dateEnd } = params;
  const offset = (page - 1) * limit;

  const filters = [
    ne(users.role, 'admin'),
    search
      ? or(
          like(users.fullName, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      : undefined,
    status ? eq(users.status, status) : undefined,
    dateStart ? sql`${users.createdAt} >= ${dateStart}` : undefined,
    dateEnd ? sql`${users.createdAt} <= ${dateEnd}` : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db.select().from(users).where(where).orderBy(asc(users.createdAt)).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatCustomerRow),
    totalCount: total,
    page,
    limit,
  });
}

export async function getCustomer(id: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, Number(id)), ne(users.role, 'admin')))
    .limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Customer not found');
  }

  return formatCustomerRow(rows[0]);
}
