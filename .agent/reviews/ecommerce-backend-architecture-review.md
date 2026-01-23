# Milemoto Backend (milemoto-serverside) — E‑commerce Architecture Review

Scope: `milemoto-serverside/*` (backend only). This review focuses on **business flow integrity**, **data consistency**, **scalability/performance**, **error handling/recovery**, and **security** from an e‑commerce operations perspective.

## Overall Grade (today)

**B+ (strong foundation, not yet a complete e‑commerce backend)**  
Reason: procurement + inventory workflows are solid, auth/RBAC is shaping up well, but the **core sales/checkout/order/payment/fulfillment lifecycle** is largely not implemented server-side yet, and a few “enterprise correctness” gaps remain (auditability, some schema constraints).

---

## 1) Business Flow Integrity

### What’s logically strong / consistent

- **Procurement flow (PO → GRN → inventory)** is coherent and enforceable:
  - Purchase Orders have a meaningful lifecycle and status gating (`draft`, `pending_approval`, `approved`, `partially_received`, `fully_received`, `closed`, `cancelled`) in `packages/types/src/db.schema.ts`.
  - GRN supports **draft vs posted** flow and applies inventory changes only at post time (service split: `milemoto-serverside/src/services/goodsReceipt/write.ts` + stock apply).
- **Inventory operations** exist beyond procurement:
  - **Stock adjustment** (correction) and **stock transfer** (location→location) are present (`milemoto-serverside/src/services/stock/write.ts`).
- **Admin settings** for key master data exist (currencies, taxes, payment methods, locations, etc.), so procurement can reference stable entities.

### Non-logical gaps / missing flows (important)

- **Sales commerce flow is missing server-side**:
  - No clear backend for: cart/checkout, order creation, payment authorization/capture, fulfillment/shipment, returns/refunds, invoices/credit notes.
  - This is why the backend is not yet “full e‑commerce” even if admin procurement is strong.
- **Vendor delivery / partial delivery is handled via GRNs**, which is correct, but there is no separate “ASN / delivery note” object. That’s optional, but some enterprises want it.
- **Currency exchange handling**: POs reference a currency, but there’s no clear “base currency accounting” layer (FX conversions, historic rates per PO). That’s fine for v1, but document expectations.

### Recommendations (to reach A)

- Define and implement the **sales order lifecycle** (minimum):
  - `cart` → `order(draft)` → `payment_authorized` → `paid` → `fulfilled/partially_fulfilled` → `delivered` → returns/refunds.
- Decide whether you want **Invoices** as separate entities or derived from Orders (many systems generate invoices on “paid”).

---

## 2) Data Consistency & Validation

### What’s good

- **Zod validation at route boundaries** is used widely (admin/auth helpers), preventing many invalid payloads from reaching services.
- **Status gating and invariants** exist for procurement:
  - GRN creation/posting checks PO status and remaining quantities (prevents over‑receipt).
  - PO transitions are guarded (draft/approval/editability rules).
- Foreign keys exist for most master data relationships (e.g., PO→vendor/currency/location/payment method).

### Gaps / risks

- **Role-permissions join table lacks a uniqueness constraint** in schema:
  - `rolepermissions` in `packages/types/src/db.schema.ts` has `roleId`, `permissionId`, `createdAt` but no composite primary key or unique index.
  - Risk: duplicate assignments over time (slower permission checks, confusing UX).
- **Stock movements are not audit-complete**:
  - `stockmovements` table (in `packages/types/src/db.schema.ts`) lacks:
    - `performedByUserId` (or similar)
    - `updatedAt`
  - In real operations, “who adjusted stock” and “why” must be traceable.
- **Normalization consistency** depends on per-service discipline:
  - Some services normalize strings (trim/lowercase) before inserts; ensure all critical entities do this consistently (vendors, taxes, roles, etc.).

### Recommendations (to reach A)

- Add unique/composite constraint:
  - `UNIQUE(roleId, permissionId)` on `rolepermissions`.
- Extend stock movement audit:
  - Add `performedByUserId` (FK to users) and capture it from auth context in adjustment/transfer/post flows.
- Standardize normalization rules in one helper (trim, collapse whitespace, case-folding) for “name/slug/email/phone” fields.

---

## 3) Scalability & Performance Considerations

### What’s good

- **RBAC permission caching** avoids a DB hit on every request:
  - `milemoto-serverside/src/middleware/authz.ts` caches permissions for a short TTL via `RBAC_PERMISSIONS_CACHE_TTL_MS`.
- Database access generally uses Drizzle query builder; this improves maintainability and reduces runtime SQL errors.

### Potential bottlenecks / future issues

- **RBAC permission resolution** still queries DB on cache miss and does not yet embed permissions in JWT. That’s fine now; at scale, you’ll want:
  - caching + invalidation on role change, or
  - permission claims in JWT (plus rotation/invalidation strategy).
- **Large list endpoints** should be reviewed for indexing:
  - Ensure indexes exist for common filters (status, createdAt, foreign keys).
  - Examples: `purchaseorders.status`, `purchaseorders.createdAt`, `rolepermissions(roleId, permissionId)` unique index, `permissions.slug` unique index.

### Recommendations (to reach A)

- Introduce a “DB query audit” policy:
  - Every list endpoint must have: pagination, indexed filters, and stable ordering.
- Consider adding a lightweight caching layer (in-memory is fine for single instance; Redis later) for “reference data” (currencies, taxes, locations) if needed.

---

## 4) Error Handling & Recovery

### What’s good

- Central error handler returns a consistent shape and logs server errors:
  - `milemoto-serverside/src/middleware/errorHandler.ts` returns `{ code, message, details? }` and logs 5xx via request logger.
- Zod errors return structured validation details.

### Gaps

- **DB constraint errors** (FK restrict, duplicate keys) should be consistently translated into user-friendly business messages:
  - Some services already handle duplicate-entry nicely; ensure the same for FK restrict (e.g., “Vendor is used in purchase orders; cannot delete”).
- “Saved but shows error until refresh” symptoms you saw earlier usually come from:
  - service returning the wrong condition (e.g., delete/update checking affectedRows incorrectly),
  - or client cache invalidation issues.
  - These are best caught by adding integration tests (even a small set).

### Recommendations (to reach A)

- Add a shared `translateDbError(err)` for:
  - duplicate key, FK restrict, FK cascade issues, not-null violations.
- Add minimal integration tests for the critical flows:
  - login/setup, create PO, create draft GRN, post GRN, stock adjustment, stock transfer.

---

## 5) Security Best Practices

### What’s good

- Environment validation is strict via Zod:
  - `milemoto-serverside/src/config/env.ts` validates secrets, TTLs, MFA key size, etc.
- The auth stack includes:
  - JWT access token + refresh cookie model
  - Rate limiting settings (login/IP/email windows)
  - MFA support (TOTP + backup codes)
- Setup wizard + installed gate reduces exposure of admin APIs before first-time setup:
  - `milemoto-serverside/src/middleware/ensureInstalled.ts`
  - `milemoto-serverside/src/services/setup.service.ts`

### Gaps / recommended hardening

- CORS origins are currently a single string; consider parsing `CORS_ORIGINS` as a list and validating them (avoid “*” behavior in production).
- Ensure cookies are set with secure flags in production (HttpOnly, Secure, SameSite policy appropriate for your frontend).
- Admin-only actions: ensure **authorization checks** are consistently enforced (use `requirePermission` on all admin endpoints).
- Audit logging for admin/procurement/inventory actions is essential for real business continuity.

### Recommendations (to reach A)

- Add an audit log (minimal): table `auditLogs` capturing `actorUserId`, action slug, resource type/id, timestamp, metadata.
- Add “security headers & TLS assumptions” documentation in `milemoto-serverside/README.md` for deployers (Envato customers).

---

## Practical “Next Improvements” Order (high value, low regret)

1. Add missing DB constraints (role-permissions unique; stock movement actor).
2. Add audit logging for admin operations (PO/GRN/stock adjustments/transfers, RBAC changes).
3. Implement sales order/payment/fulfillment flows (even minimal “order + payment status”).
4. Add integration tests for the critical workflows.
5. Document operational setup (Env vars, setup wizard flow, backup/admin recovery).

