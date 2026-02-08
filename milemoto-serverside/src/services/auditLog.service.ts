import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { auditlogs } from '@milemoto/types';
import { db } from '../db/drizzle.js';
import { buildPaginatedResponse } from '../utils/response.js';
import type { CreateAuditLogDto, ListAuditLogsQuery } from '@milemoto/types';

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an audit event for a sensitive operation.
 * This is a fire-and-forget operation - errors are logged but not thrown.
 */
export async function logAuditEvent(data: CreateAuditLogDto): Promise<void> {
  try {
    await db.insert(auditlogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent?.slice(0, 512) ?? null,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('[AuditLog] Failed to log event:', error);
  }
}

/**
 * Helper to create audit log data from Express request.
 */
export function createAuditData(
  req: { user?: { id: string }; ip?: string; get: (header: string) => string | undefined },
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId?: string | number,
  metadata?: Record<string, unknown>
): CreateAuditLogDto {
  return {
    userId: Number(req.user?.id ?? 0),
    action,
    entityType,
    entityId: entityId?.toString(),
    metadata,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
}

/**
 * List audit logs with filters and pagination.
 */
export async function listAuditLogs(query: ListAuditLogsQuery) {
  const offset = (query.page - 1) * query.limit;

  const filters = [
    query.userId ? eq(auditlogs.userId, query.userId) : undefined,
    query.entityType ? eq(auditlogs.entityType, query.entityType) : undefined,
    query.entityId ? eq(auditlogs.entityId, query.entityId) : undefined,
    query.action ? eq(auditlogs.action, query.action) : undefined,
    query.dateFrom ? gte(auditlogs.createdAt, query.dateFrom) : undefined,
    query.dateTo ? lte(auditlogs.createdAt, query.dateTo) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(auditlogs)
      .where(where)
      .orderBy(desc(auditlogs.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(auditlogs)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  // Parse metadata JSON for each item
  const parsedItems = items.map((item) => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null,
  }));

  return buildPaginatedResponse({
    items: parsedItems,
    totalCount: total,
    page: query.page,
    limit: query.limit,
  });
}
