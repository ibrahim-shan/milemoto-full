import { z } from "zod";
import { ApiModel } from "./common.types.js";
import { type MailSetting } from "./db.types.js";
import { LowerTrimmedStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

const EmptyStringToNull = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().nullable()
);

export const MailEncryption = z.enum(["none", "tls", "ssl"]);

export const MailSettings = z.object({
  id: z.number().int().positive(),
  host: TrimmedStringSchema.min(1).max(255).nullable(),
  port: z.number().int().positive().nullable(),
  username: TrimmedStringSchema.min(1).max(255).nullable(),
  encryption: MailEncryption,
  fromName: TrimmedStringSchema.min(1).max(100).nullable(),
  fromEmail: LowerTrimmedStringSchema.email().max(191).nullable(),
  hasPassword: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type MailSettingsDto = z.infer<typeof MailSettings>;

export const UpdateMailSettings = z.object({
  host: EmptyStringToNull.optional(),
  port: z
    .preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().positive().nullable())
    .optional(),
  username: EmptyStringToNull.optional(),
  password: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).max(255).nullable()).optional(),
  encryption: MailEncryption.optional(),
  fromName: EmptyStringToNull.optional(),
  fromEmail: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    LowerTrimmedStringSchema.email().max(191).nullable()
  ).optional(),
});

export type UpdateMailSettingsDto = z.infer<typeof UpdateMailSettings>;

export const SendTestEmail = z.object({
  toEmail: LowerTrimmedStringSchema.email().max(191),
});

export type SendTestEmailDto = z.infer<typeof SendTestEmail>;

export type MailSettingsResponse = ApiModel<Omit<MailSetting, "passwordEnc">> & {
  hasPassword: boolean;
};

export type MailSettingsResponseDto = MailSettingsResponse;
