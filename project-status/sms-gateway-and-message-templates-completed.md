# SMS Gateway & Message Templates (Completed)

## SMS Gateway (Admin Settings + Backend)

- Admin settings page for SMS gateway management is implemented at `/admin/settings/sms-gateway`.
- Admin can create, update, and activate SMS gateways (currently Infobip flow is implemented).
- Gateway configuration supports SMS sender and WhatsApp sender/template fields.
- API key handling supports saved secret state (`hasApiKey`) and clearing/replacing keys.
- Sender verification flags are supported for SMS and WhatsApp and are enforced before activation/sending.
- Test SMS endpoint is implemented from admin settings.
- Test WhatsApp endpoint is implemented from admin settings.
- Delivery reports list endpoint is implemented for admin review.
- SMS test/send rate limiting (`smsTestLimiter`) is applied on admin test endpoints.
- Permission enforcement is implemented using `settings.read` / `settings.manage`.

## SMS Gateway Runtime Sending (Implemented)

- Shared backend SMS send function is implemented: `sendSmsMessage(...)`.
- Active gateway lookup is implemented (runtime uses the currently active gateway only).
- Runtime config validation is implemented (base URL, sender ID, API key required).
- SMS sender verification is enforced before send.
- Blocked-phone guard is implemented before sending.
- Daily quota enforcement is implemented by channel (`sms`, `whatsapp`).
- Delivery report records are created when provider accepts SMS/WhatsApp test messages.
- Provider integration for Infobip SMS is implemented.
- Provider integration for Infobip WhatsApp test sending is implemented.
- WhatsApp template approval check (Infobip) is implemented before WhatsApp test send.

## Webhooks / Delivery Reports (Implemented)

- Infobip SMS delivery webhook endpoint is implemented.
- Webhook signature verification is implemented (`x-infobip-signature-256`).
- Valid delivery payloads are stored as delivery-report records.
- Invalid/missing signature requests are rejected.
- Delivery reports can be retrieved in admin settings.

## Current App Flows Using SMS Gateway (Implemented)

- Auth phone verification start flow sends verification code through SMS gateway.
- Password reset by phone flow sends reset message through SMS gateway.
- These flows use backend `sendSmsMessage(...)` and therefore respect active gateway config/guards/quota.

## Message Templates (Admin UI Implemented)

- Admin Message Templates page exists at `/admin/settings/message-templates`.
- UI supports channel tabs: Email / SMS / WhatsApp.
- UI includes template entries for order events and auth/verification events.
- UI supports per-template enable/disable toggles (local page state).
- UI supports editing template body text (local page state).
- UI includes a variable/code dictionary for template placeholders (e.g. `{{orderNumber}}`, `{{verificationCode}}`).
- UI includes channel-specific visibility behavior for relevant templates (email-only vs SMS/WhatsApp-only entries).

## Relationship Between SMS Gateway and Message Templates (Current Completed State)

- SMS Gateway runtime sending is implemented and active in auth flows.
- Message Templates page UI is implemented as an admin editor interface.
- Message Templates are not yet persisted to backend storage.
- Message Templates are not yet used by SMS runtime sending code.
- Current SMS/auth messages are generated directly in backend service code and then sent via SMS Gateway.
