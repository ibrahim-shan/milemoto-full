import { and, eq, sql } from 'drizzle-orm';
import { rolepermissions, roles } from '@milemoto/types';
import type { CreateRoleDto, UpdateRoleDto } from '../../routes/admin/helpers/rbac.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getRole } from './read.js';
import { logAuditEvent } from '../auditLog.service.js';
import type { AuditContext } from '../adminUsers/write.js';

export async function createRole(data: CreateRoleDto, audit?: AuditContext) {
  try {
    const uniquePermissionIds = Array.from(new Set(data.permissionIds ?? []));
    const payload: CreateRoleDto = { ...data, permissionIds: uniquePermissionIds };

    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, payload.name))
      .limit(1);
    if (existing) {
      throw httpError(409, 'Conflict', 'Role name already exists');
    }

    const roleId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(roles)
        .values({
          name: payload.name,
          description: payload.description ?? null,
          isSystem: false,
        })
        .$returningId();

      const roleId = inserted[0]?.id ? Number(inserted[0].id) : undefined;
      if (!roleId) {
        throw httpError(500, 'InsertFailed', 'Failed to create role');
      }

      if (uniquePermissionIds.length > 0) {
        const values = uniquePermissionIds.map((pid) => ({
          roleId,
          permissionId: pid,
        }));
        await tx.insert(rolepermissions).values(values);
      }

      return roleId;
    });

    // Audit log
    if (audit) {
      void logAuditEvent({
        userId: audit.userId,
        action: 'create',
        entityType: 'roles',
        entityId: String(roleId),
        metadata: { name: payload.name, permissionIds: uniquePermissionIds },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      });
    }

    return getRole(roleId);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'Conflict',
        'Role name already exists or one of the selected permissions is already linked.'
      );
    }
    throw err;
  }
}

export async function updateRole(id: number, data: UpdateRoleDto, audit?: AuditContext) {
  const current = await getRole(id);

  if (current.isSystem) {
    throw httpError(403, 'Forbidden', 'System roles cannot be edited');
  }

  try {
    await db.transaction(async (tx) => {
      if (data.name && data.name !== current.name) {
        const [existing] = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(and(eq(roles.name, data.name), sql`${roles.id} != ${id}`))
          .limit(1);
        if (existing) {
          throw httpError(409, 'Conflict', 'Role name already exists');
        }
      }

      const updates: Partial<typeof roles.$inferInsert> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description ?? null;

      if (Object.keys(updates).length > 0) {
        await tx.update(roles).set(updates).where(eq(roles.id, id));
      }

      if (data.permissionIds !== undefined) {
        const uniquePermissionIds = Array.from(new Set(data.permissionIds));
        await tx.delete(rolepermissions).where(eq(rolepermissions.roleId, id));
        if (uniquePermissionIds.length > 0) {
          const values = uniquePermissionIds.map((pid) => ({
            roleId: id,
            permissionId: pid,
          }));
          await tx.insert(rolepermissions).values(values);
        }
      }
    });

    // Audit log
    if (audit) {
      void logAuditEvent({
        userId: audit.userId,
        action: 'update',
        entityType: 'roles',
        entityId: String(id),
        metadata: { before: { name: current.name }, after: data },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      });
    }

    return getRole(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'Conflict',
        'Role name already exists or one of the selected permissions is already linked.'
      );
    }
    throw err;
  }
}

export async function deleteRole(id: number, audit?: AuditContext) {
  const role = await getRole(id);
  if (role.isSystem) {
    throw httpError(403, 'Forbidden', 'Cannot delete system role');
  }

  await db.delete(rolepermissions).where(eq(rolepermissions.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));

  // Audit log
  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'delete',
      entityType: 'roles',
      entityId: String(id),
      metadata: { deleted: { name: role.name } },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return { success: true };
}
