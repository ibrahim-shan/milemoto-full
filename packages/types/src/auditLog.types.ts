import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────────────────────

export const AuditActionSchema = z.enum([
    'create',
    'update',
    'delete',
    // Auth-specific actions
    'login',
    'login_failed',
    'logout',
    'refresh',
    'password_change',
    'password_reset',
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntityTypeSchema = z.enum([
    'users',
    'roles',
    'products',
    'stock',
    'site_settings',
    'sms_gateways',
    'payment_methods',
    'shipping_methods',
    'auth',
]);
export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;

export const CreateAuditLogSchema = z.object({
    userId: z.number().int().positive(),
    action: AuditActionSchema,
    entityType: z.string().max(50),
    entityId: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    ipAddress: z.string().max(45).optional(),
    userAgent: z.string().max(512).optional(),
});

export type CreateAuditLogDto = z.infer<typeof CreateAuditLogSchema>;

export const ListAuditLogsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    userId: z.coerce.number().int().positive().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    action: AuditActionSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;
