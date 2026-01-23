import { z } from "zod";
import { ApiModel } from "./common.types.js";
import { type SmsGateway } from "./db.types.js";
import { LowerTrimmedStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

const EmptyStringToNull = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().nullable()
);

export const SmsGatewayProvider = z.enum(["infobip"]);

export const SmsGatewayStatus = z.enum(["active", "inactive"]);

export const SmsDeliveryChannel = z.enum(["sms", "whatsapp"]);

export const SmsGatewaySettings = z.object({
  id: z.number().int().positive(),
  provider: SmsGatewayProvider,
  name: TrimmedStringSchema.min(1).max(100),
  status: SmsGatewayStatus,
  baseUrl: TrimmedStringSchema.min(1).max(255).nullable(),
  senderId: TrimmedStringSchema.min(1).max(100).nullable(),
  smsSenderVerified: z.boolean(),
  whatsappSenderId: TrimmedStringSchema.min(1).max(100).nullable(),
  whatsappSenderVerified: z.boolean(),
  whatsappTemplateName: TrimmedStringSchema.min(1).max(200).nullable(),
  whatsappLanguage: TrimmedStringSchema.min(1).max(10).nullable(),
  hasApiKey: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SmsGatewaySettingsDto = z.infer<typeof SmsGatewaySettings>;

export const CreateSmsGateway = z.object({
  provider: SmsGatewayProvider,
  name: TrimmedStringSchema.min(1).max(100),
  baseUrl: EmptyStringToNull.optional(),
  senderId: EmptyStringToNull.optional(),
  smsSenderVerified: z.boolean().optional(),
  whatsappSenderId: EmptyStringToNull.optional(),
  whatsappSenderVerified: z.boolean().optional(),
  whatsappTemplateName: EmptyStringToNull.optional(),
  whatsappLanguage: EmptyStringToNull.optional(),
  apiKey: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).max(255).nullable()).optional(),
});

export type CreateSmsGatewayDto = z.infer<typeof CreateSmsGateway>;

export const UpdateSmsGateway = z.object({
  name: TrimmedStringSchema.min(1).max(100).optional(),
  baseUrl: EmptyStringToNull.optional(),
  senderId: EmptyStringToNull.optional(),
  smsSenderVerified: z.boolean().optional(),
  whatsappSenderId: EmptyStringToNull.optional(),
  whatsappSenderVerified: z.boolean().optional(),
  whatsappTemplateName: EmptyStringToNull.optional(),
  whatsappLanguage: EmptyStringToNull.optional(),
  apiKey: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).max(255).nullable()).optional(),
});

export type UpdateSmsGatewayDto = z.infer<typeof UpdateSmsGateway>;

export const SendTestSms = z.object({
  toNumber: LowerTrimmedStringSchema.regex(/^\+\d{6,15}$/).max(16),
  message: TrimmedStringSchema.min(1).max(500).optional(),
});

export type SendTestSmsDto = z.infer<typeof SendTestSms>;

export const SendTestWhatsapp = z.object({
  toNumber: LowerTrimmedStringSchema.regex(/^\+\d{6,15}$/).max(16),
  placeholder: TrimmedStringSchema.min(1).max(100).optional(),
});

export type SendTestWhatsappDto = z.infer<typeof SendTestWhatsapp>;

export type SmsGatewayResponse = ApiModel<Omit<SmsGateway, "configJson" | "secretEnc">> & {
  baseUrl: string | null;
  senderId: string | null;
  smsSenderVerified: boolean;
  whatsappSenderId: string | null;
  whatsappSenderVerified: boolean;
  whatsappTemplateName: string | null;
  whatsappLanguage: string | null;
  hasApiKey: boolean;
};

export type SmsGatewayResponseDto = SmsGatewayResponse;

export const SmsDeliveryReportResponse = z.object({
  id: z.number().int().positive(),
  provider: SmsGatewayProvider,
  channel: SmsDeliveryChannel,
  messageId: TrimmedStringSchema.min(1).max(100),
  toNumber: TrimmedStringSchema.min(1).max(32),
  statusGroup: TrimmedStringSchema.min(1).max(50).nullable(),
  statusName: TrimmedStringSchema.min(1).max(100).nullable(),
  statusDescription: TrimmedStringSchema.min(1).max(255).nullable(),
  errorName: TrimmedStringSchema.min(1).max(100).nullable(),
  errorDescription: TrimmedStringSchema.min(1).max(255).nullable(),
  sentAt: z.string().nullable(),
  doneAt: z.string().nullable(),
  receivedAt: z.string(),
});

export type SmsDeliveryReportResponseDto = z.infer<typeof SmsDeliveryReportResponse>;
