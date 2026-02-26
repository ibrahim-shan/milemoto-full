# Mail (Completed)

## Admin Mail Settings (Implemented)

- Admin mail settings page is implemented at `/admin/settings/mail`.
- Admin UI supports configuring SMTP host, port, username, password, and encryption (`none` / `tls` / `ssl`).
- Admin UI supports sender defaults (`fromName`, `fromEmail`).
- Admin UI supports clearing a previously saved SMTP password.
- Admin UI includes a test-email action that uses the saved database settings.
- Frontend React Query hooks are implemented for get/update/test mail settings (`useMailSettingsQueries`).

## Admin Mail Settings API (Implemented)

- `GET /api/v1/admin/mail` returns mail settings.
- `PUT /api/v1/admin/mail` updates mail settings.
- `POST /api/v1/admin/mail/test` sends a test email.
- Admin mail routes are protected with `settings.read` / `settings.manage` permissions.
- Request validation is implemented using shared DTO schemas (`UpdateMailSettings`, `SendTestEmail`).

## Mail Settings Storage / Security (Implemented)

- Mail settings are stored in the `mailsettings` table as a singleton settings row.
- Missing mail settings row is auto-initialized by the mail settings service (`ensureMailSettingsRow`).
- SMTP password is encrypted before storage.
- Saved SMTP password can be cleared explicitly.
- Mail settings responses expose `hasPassword` instead of returning the raw password.

## Mail Sending Runtime (Implemented)

- Shared email sending service is implemented in `emailService.ts` using Nodemailer.
- SMTP transport is built from saved mail settings (host/port/encryption/credentials).
- Test environment uses Nodemailer `jsonTransport` for non-network test sends.
- From-address resolution uses saved `fromName` / `fromEmail` and falls back to defaults if missing.
- Mailer transport cache is implemented with short TTL to reduce repeated transport rebuilds.

## Email Delivery Logging (Implemented)

- Email send attempts are logged to `emaildeliverylogs`.
- Successful sends are logged with status `sent`, provider `smtp`, and message metadata.
- Failed sends are logged with status `failed` and error text.
- Admin mail test email send writes to the same email delivery log table.
- Auth verification and password reset emails also write delivery logs.

## Auth Flows Using Mail (Implemented)

- Signup email verification flow sends verification emails through the shared mail service.
- Resend verification email flow is implemented.
- Verify email token flow is implemented and updates user verification state.
- Start email change flow is implemented and sends a verification email for the new address.
- Password reset by email flow sends reset email through the shared mail service.
- Password reset completion flow is implemented (token validation + password update).

## Mail Flow (Current Implemented Behavior)

- Admin configures SMTP in `/admin/settings/mail` and saves settings.
- Mail settings are stored (with encrypted password) in the database singleton row.
- Runtime email sends (auth verification / password reset) read the saved mail settings.
- Nodemailer transport is built from those settings.
- Email is sent using the resolved From address.
- Delivery result is recorded in `emaildeliverylogs`.

## Mail Test Coverage (Implemented)

- `tests/settings/mail-settings.test.ts` covers:
  - get mail settings
  - update mail settings
  - password save/clear behavior (`hasPassword`)
  - send test email endpoint in test environment
- Auth test suite covers email verification and email-change related flows.
