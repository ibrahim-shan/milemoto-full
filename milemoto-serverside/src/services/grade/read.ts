import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { grades } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/grade.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatGradeRow } from './shared.js';

export async function listGrades(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(like(grades.name, `%${search}%`), like(grades.description, `%${search}%`))
      : undefined,
    status ? eq(grades.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db.select().from(grades).where(where).orderBy(asc(grades.name)).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(grades)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatGradeRow),
    totalCount: total,
    page,
    limit,
  });
}

export async function getGrade(id: number) {
  const rows = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Grade not found');
  }
  return formatGradeRow(rows[0]);
}
