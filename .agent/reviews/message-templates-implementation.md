# Message Templates Integration Flow

Goal: store per-channel templates (Email/SMS/WhatsApp), then bind each template to a specific system event (signup, reset, orders, etc.) so messages are rendered consistently.

## 1) Define the canonical template keys
- Status: done.
- Keep a fixed enum list of template keys (no free-form keys):
  - `order_pending`
  - `order_confirmation`
  - `order_on_the_way`
  - `order_delivered`
  - `order_canceled`
  - `order_rejected`
  - `order_refunded`
  - `admin_new_order`
  - `reset_password`
  - `signup_verification`
  - `phone_verification`
  - `email_change_verification`
  - `phone_change_verification`

## 2) DB schema (single source of truth)
- `messageTemplates` table:
  - `id`
  - `channel` (`email` | `sms` | `whatsapp`)
  - `key` (template key)
  - `subject` (nullable, used only for `email`)
  - `body` (text)
  - `status` (`active` | `inactive`)
  - `updatedAt`
  - Unique index: `(channel, key)`
- Seed defaults for each channel/key with the UI defaults.

## 3) Types & validation
- Add `MessageTemplateKey` union type (matches DB keys).
- Add `MessageTemplateChannel` union type.
- Add Zod schema for create/update:
  - `channel`, `key`, `body`, `status`, optional `subject`.
  - Disallow `subject` for `sms`/`whatsapp`.

## 4) Admin API
- Endpoints:
  - `GET /admin/message-templates?channel=...`
  - `PUT /admin/message-templates/:id` (update body/status/subject)
  - Optional: `POST /admin/message-templates/seed` (idempotent defaults)
- Response returns `id, channel, key, status, subject, body`.

## 5) Template resolution helper
- `resolveTemplate(channel, key)`:
  - Reads from DB cache (short TTL).
  - Falls back to seeded defaults if missing.
  - Returns `{ subject?, body }`.

## 6) Variable rendering helper
- `renderTemplate(body, vars)`:
  - Simple token replacement `{{token}}`.
  - Strict mode: throw if required token missing.
  - Optional: allow a fallback map for missing tokens.

## 7) Bind templates to flows (backend)
Use the helper in each flow:

### Auth
- Signup verification (Email):
  - Key: `signup_verification`, channel: `email`
  - Vars: `verificationLink`
- Password reset (Email):
  - Key: `reset_password`, channel: `email`
  - Vars: `resetLink`
- Password reset (SMS/WhatsApp):
  - Key: `reset_password`, channel: `sms` or `whatsapp`
  - Vars: `resetCode`
- Phone verification:
  - Key: `phone_verification`, channel: `sms` or `whatsapp`
  - Vars: `verificationCode`
- Email change verification:
  - Key: `email_change_verification`, channel: `email`
  - Vars: `verificationLink`
- Phone change verification:
  - Key: `phone_change_verification`, channel: `sms` or `whatsapp`
  - Vars: `verificationCode`

### Orders
- `order_pending`: on order creation
- `order_confirmation`: on approval/confirmation
- `order_on_the_way`: on shipment
- `order_delivered`: on delivery
- `order_canceled`: on cancel
- `order_rejected`: on reject
- `order_refunded`: on refund
- `admin_new_order`: internal notification (email or sms, depending on admin preference)

## 8) Channel selection rules
- Email templates use link variables.
- SMS/WhatsApp templates use code variables (short and safe).
- Enforce channel rules in `renderTemplate` (ex: no `{{resetLink}}` in SMS).

## 9) Delivery logging
- Log every send with:
  - `templateKey`, `channel`, `to`, `status`, `providerResponse`.
- Update status asynchronously via provider webhook (SMS/WhatsApp).

## 10) UI integration
- Message Templates page loads all templates for the selected channel.
- Save button per channel persists `body/status/subject`.
- No create/delete in UI; admin edits pre-seeded templates only.

## 11) Tests
- Unit tests:
  - `resolveTemplate` fallback behavior
  - `renderTemplate` token replacement + missing token handling
- Integration tests:
  - Admin update persists template body
  - Signup verification uses `signup_verification` template
  - SMS reset uses `reset_password` with code
  - Order transitions trigger correct template keys

