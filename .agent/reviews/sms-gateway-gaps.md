# SMS Gateway (Infobip) - Remaining Gaps

## Not Implemented Yet
- [x] Delivery reports (webhook + stored status so "sent" != "delivered").
- [x] Webhook signature validation (Infobip delivery callbacks).
- [x] Status UI (show recent delivery reports in SMS Gateway settings).
- [x] Sender verification status (manual toggle).
- [x] Template status validation (Infobip template status check before WhatsApp send).
- [x] Rate limiting / quota handling (test endpoints + daily quotas).
- [deferred] Opt-out / consent handling and blocklist.
- [x] Phone normalization (normalize formatting before validation).
- [x] Error code mapping to user-friendly messages (credit low, sender not registered, etc.).
- [ ] Multi-gateway fallback / priority routing.

## Intentionally Skipped
- Inbound messages (two-way SMS/WhatsApp) per current one-way requirement.