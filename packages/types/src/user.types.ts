import { z } from "zod";
import { type User } from "./db.types.js";
import { ApiModel } from "./common.types.js";

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().optional().nullable(),
  fullName: z.string(),
  phone: z.string().optional().nullable(),
  phoneVerifiedAt: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "blocked"]),
  roleId: z.number().optional().nullable(),
  roleName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().optional().nullable(),
  fullName: z.string().min(1, "Full Name is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  roleId: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional().nullable(),
  fullName: z.string().optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  roleId: z.number().optional().nullable(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export interface UserResponse extends ApiModel<User> {
  roleName?: string;
}
