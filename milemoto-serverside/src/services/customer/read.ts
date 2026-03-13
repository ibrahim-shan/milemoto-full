import { and, asc, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import { orders, users } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/customer.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatCustomerRow } from './shared.js';

export async function listCustomers(params: ListQueryDto) {
  const {
    page,
    limit,
    search,
    filterMode = 'all',
    status,
    ordersMin,
    ordersMax,
    spentMin,
    spentMax,
    dateStart,
    dateEnd,
    sortBy,
    sortDir,
  } = params;
  const offset = (page - 1) * limit;

  const totalOrdersExpr = sql<number>`
    (select count(*) from ${orders} where ${orders.userId} = ${users.id})
  `;
  const totalSpentExpr = sql<number>`
    (
      select coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.grandTotal} else 0 end), 0)
      from ${orders}
      where ${orders.userId} = ${users.id}
    )
  `;

  const baseFilters = [ne(users.role, 'admin')];

  const searchFilter = search
    ? or(
        like(users.fullName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.phone, `%${search}%`)
      )
    : undefined;

  const optionalFilters = [
    status ? eq(users.status, status) : undefined,
    ordersMin !== undefined ? sql`${totalOrdersExpr} >= ${ordersMin}` : undefined,
    ordersMax !== undefined ? sql`${totalOrdersExpr} <= ${ordersMax}` : undefined,
    spentMin !== undefined ? sql`${totalSpentExpr} >= ${spentMin}` : undefined,
    spentMax !== undefined ? sql`${totalSpentExpr} <= ${spentMax}` : undefined,
    dateStart ? sql`${users.createdAt} >= ${dateStart}` : undefined,
    dateEnd ? sql`${users.createdAt} <= ${dateEnd}` : undefined,
  ].filter(Boolean);

  const combinedOptionalFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);

  const where = and(...baseFilters, searchFilter, combinedOptionalFilter);
  const sortDirection = sortDir === 'desc' ? 'desc' : 'asc';
  const orderByExpr =
    sortBy === 'fullName'
      ? sortDirection === 'desc'
        ? desc(users.fullName)
        : asc(users.fullName)
      : sortBy === 'email'
        ? sortDirection === 'desc'
          ? desc(users.email)
          : asc(users.email)
        : sortBy === 'status'
          ? sortDirection === 'desc'
            ? desc(users.status)
            : asc(users.status)
          : sortBy === 'totalOrders'
            ? sortDirection === 'desc'
              ? desc(totalOrdersExpr)
              : asc(totalOrdersExpr)
            : sortBy === 'totalSpent'
              ? sortDirection === 'desc'
                ? desc(totalSpentExpr)
                : asc(totalSpentExpr)
              : sortDirection === 'desc'
                ? desc(users.createdAt)
                : asc(users.createdAt);

  const [items, countRows] = await Promise.all([
    db.select().from(users).where(where).orderBy(orderByExpr).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const userIds = items.map(row => row.id);
  const orderStatsRows =
    userIds.length > 0
      ? await db
          .select({
            userId: orders.userId,
            totalOrders: sql<number>`count(*)`,
            totalSpent: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.grandTotal} else 0 end), 0)`,
          })
          .from(orders)
          .where(inArray(orders.userId, userIds))
          .groupBy(orders.userId)
      : [];
  const orderStatsByUser = new Map(
    orderStatsRows.map(row => [
      row.userId,
      {
        totalOrders: Number(row.totalOrders ?? 0),
        totalSpent: Number(row.totalSpent ?? 0),
      },
    ]),
  );

  return buildPaginatedResponse({
    items: items.map(row => {
      const formatted = formatCustomerRow(row);
      const stats = orderStatsByUser.get(row.id);
      return {
        ...formatted,
        totalOrders: stats?.totalOrders ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
      };
    }),
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
