import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { categories } from '@milemoto/types';
import type { CategoryDropdownItemResponse, CategoryResponse } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/category.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { toCategoryResponse } from './shared.js';

export async function listCategories(params: ListQueryDto) {
  const { page, limit, search, status, parentId } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(like(categories.name, `%${search}%`), like(categories.description, `%${search}%`))
      : undefined,
    status ? eq(categories.status, status) : undefined,
    parentId !== undefined ? eq(categories.parentId, parentId) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(where)
      .orderBy(asc(categories.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(categories)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(toCategoryResponse),
    totalCount: total,
    page,
    limit,
  });
}

export async function getCategory(id: number) {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Category not found');
  }
  return toCategoryResponse(rows[0]);
}

export async function getCategoryTree() {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  const mapped = rows.map(toCategoryResponse);

  const categoryMap = new Map<number, CategoryResponse & { children?: CategoryResponse[] }>();
  const tree: (CategoryResponse & { children?: CategoryResponse[] })[] = [];

  mapped.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  mapped.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId === null) {
      tree.push(node);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children!.push(node);
      }
    }
  });

  return tree;
}

export async function listAllCategories(includeInactive = false, onlyRoots = false) {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql> | undefined)[] = [];
  if (!includeInactive) conditions.push(eq(categories.status, 'active'));
  if (onlyRoots) conditions.push(sql`${categories.parentId} IS NULL`);

  const activeConditions = conditions.filter(Boolean) as (
    | ReturnType<typeof sql>
    | ReturnType<typeof eq>
  )[];
  const where =
    activeConditions.length === 0
      ? undefined
      : activeConditions.length === 1
        ? (activeConditions[0] as ReturnType<typeof sql>)
        : (and(...(activeConditions as ReturnType<typeof sql>[])) as ReturnType<typeof sql>);

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      status: categories.status,
    })
    .from(categories)
    .where(where)
    .orderBy(asc(categories.name));

  return rows as CategoryDropdownItemResponse[];
}
