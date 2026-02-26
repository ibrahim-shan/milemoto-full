# Auth - Completed (Current State)

This file lists auth features that are already implemented and working in the app (based on the current auth routes/services and auth test suite).

## Core Authentication

- User registration (`/api/v1/auth/register`)
- User login (`/api/v1/auth/login`)
- Refresh token flow (`/api/v1/auth/refresh`)
- Logout (`/api/v1/auth/logout`)
- Logout all sessions (`/api/v1/auth/logout-all`)
- Authenticated permissions endpoint (`/api/v1/auth/permissions`)
- Current user profile endpoint (`/api/v1/auth/me`)

## CSRF & Request Protection

- CSRF bootstrap endpoint (`/api/v1/auth/csrf`)
- Double-submit CSRF token check for browser POST requests
- Origin/Referer validation for auth POST requests
- Allows non-browser clients without Origin/Referer while still protecting browser flows

## Rate Limiting (Auth Flows)

- Login rate limiting by IP and email
- General auth limiter on password reset / resend endpoints
- Phone verification start/confirm rate limits
- MFA login verification rate limit

## Password & Account Recovery

- Change password for authenticated users (`/api/v1/auth/change-password`)
- Email verification by token (`/api/v1/auth/verify-email`)
- Resend email verification (`/api/v1/auth/verify-email/resend`)
- Password reset request by email (`/api/v1/auth/forgot`)
- Password reset request by phone (`/api/v1/auth/forgot/phone`)
- Password reset using token (`/api/v1/auth/reset`)

## Profile & Account Updates

- Update profile (full name / phone) (`/api/v1/auth/me/update`)
- Update default shipping address (`/api/v1/auth/me/address`)
- Start email change flow (`/api/v1/auth/email/change/start`)

## Phone Verification

- Start phone verification (`/api/v1/auth/phone/verify/start`)
- Confirm phone verification code (`/api/v1/auth/phone/verify/confirm`)
- Feature-toggle-aware phone verification behavior

## MFA (Multi-Factor Authentication)

- MFA setup start (`/api/v1/auth/mfa/setup/start`)
- MFA setup verification / enable (`/api/v1/auth/mfa/setup/verify`)
- MFA disable (password + TOTP or backup code) (`/api/v1/auth/mfa/disable`)
- MFA backup code regeneration (`/api/v1/auth/mfa/backup-codes/regen`)
- MFA login challenge verification (`/api/v1/auth/mfa/login/verify`)
- MFA challenge expiry handling
- Backup codes single-use behavior

## Trusted Devices

- List trusted devices (`/api/v1/auth/trusted-devices`)
- Revoke a trusted device (`/api/v1/auth/trusted-devices/revoke`)
- Revoke all trusted devices (`/api/v1/auth/trusted-devices/revoke-all`)
- Untrust current device (`/api/v1/auth/trusted-devices/untrust-current`)
- Trusted-device cookie handling/cleanup during revoke flows

## OAuth (Google)

- Google OAuth start endpoint (`/api/v1/auth/google/start`)
- Google OAuth callback (`/api/v1/auth/google/callback`)
- OAuth state signing/verification and nonce usage
- Google identity verification and user resolution/creation flow
- Session creation and redirect flow after Google auth
- MFA-aware Google login flow (trusted-device bypass + MFA challenge redirect)

## Auth Error Handling

- Central auth route error handling (`handleAuthRouteError`)
- Validation errors normalized through auth route error handling
- Idempotent logout behavior covered by tests (invalid/missing refresh token still handled safely)

## Automated Test Coverage (Auth Folder)

Auth tests are present and cover implemented flows including:

- Registration + login
- Login status / me endpoint
- Refresh and refresh rotation
- Logout / logout-all / invalid logout behavior
- CSRF protection
- Permissions endpoint
- Password change and password reset flows
- Email verification + invalid email verification cases
- Email change start validation/flow
- Phone verification start/confirm + invalid cases
- MFA setup/login/backup/regen/expiry flows
- Trusted devices (list/revoke/revoke-all/untrust-current)
- OAuth flow
- Auth-related rate limiting scenarios
