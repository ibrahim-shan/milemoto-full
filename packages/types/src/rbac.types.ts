import { z } from "zod";
import { type Role, type Permission } from "./db.types.js";
import { ApiModel } from "./common.types.js";
import {
  IsoDateTimeStringSchema,
  LowerTrimmedStringSchema,
  TrimmedStringSchema,
} from "./zod.helpers.js";

// Permission Types
export const PermissionSchema = z.object({
  id: z.number(),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required"),
  description: TrimmedStringSchema.min(1, "Description is required"),
  resourceGroup: TrimmedStringSchema.min(1, "Resource group is required"),
  createdAt: IsoDateTimeStringSchema,
  updatedAt: IsoDateTimeStringSchema,
});

// Role Types
// For Validation
export const RoleSchema = z.object({
  id: z.number(),
  name: TrimmedStringSchema.min(1, "Name is required"),
  description: z.string().optional().nullable(),
  isSystem: z.union([z.boolean(), z.number()]).transform((val) => Boolean(val)),
  permissions: z.array(PermissionSchema).optional(),
  createdAt: IsoDateTimeStringSchema,
  updatedAt: IsoDateTimeStringSchema,
});

export const CreateRoleSchema = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  description: TrimmedStringSchema.optional(),
  permissionIds: z.array(z.number()).optional(),
});

export const UpdateRoleSchema = z.object({
  name: TrimmedStringSchema.min(1).optional(),
  description: TrimmedStringSchema.optional(),
  permissionIds: z.array(z.number()).optional(),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

export interface PermissionResponse extends ApiModel<Permission> {
}

export interface RoleResponse extends ApiModel<Role> {
  permissions?: PermissionResponse[];
}
