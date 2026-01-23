import { z } from "zod";
import { TrimmedStringSchema } from "./zod.helpers.js";

export const MessageTemplateChannel = z.enum(["email", "sms", "whatsapp"]);

export const MessageTemplateStatus = z.enum(["active", "inactive"]);

export const MessageTemplateKey = z.enum([
  "order_pending",
  "order_confirmation",
  "order_on_the_way",
  "order_delivered",
  "order_canceled",
  "order_rejected",
  "order_refunded",
  "admin_new_order",
  "reset_password",
  "signup_verification",
  "phone_verification",
  "email_change_verification",
  "phone_change_verification",
]);

export const MessageTemplatePayload = z.object({
  channel: MessageTemplateChannel,
  key: MessageTemplateKey,
  subject: TrimmedStringSchema.max(255).optional().nullable(),
  body: TrimmedStringSchema.min(1),
  status: MessageTemplateStatus.default("active"),
});

export type MessageTemplatePayloadDto = z.infer<typeof MessageTemplatePayload>;
