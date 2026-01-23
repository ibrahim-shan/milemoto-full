# Milemoto Serverside Backend Audit

## Project Overview
The backend shows a strong foundation: environment validation, centralized logging, rate limiting, RBAC, and a broad test suite. The biggest risks now are maintainability (parallel “monolithic vs split” service patterns), migration/seed consistency, and a few areas where caching/permissions and cross‑module conventions can drift. Overall quality is solid but not yet “Grade A” for long‑term maintainability without cleanup.

## Architecture Evaluation
**Strengths**
- Clear layering: `routes` → `services` → `db`/`utils`.
- Centralized env validation (`src/config/env.ts`) and runtime config.
- Consistent middleware stack (CORS, helmet, rate limits, auth).
- Drizzle usage in core services; query builder is typed.

**Weaknesses / Risks**
- **Mixed structure**: both `*.service.ts` and split sub‑modules (`services/<domain>/{read,write,shared}.ts`) exist for the same domain. This creates confusion and duplication risk.
- **Seed/migration management** is fragmented; seeds are not clearly versioned or idempotent in one place.
- **Cache invalidation** for RBAC is TTL‑only; role changes can stay stale.

## Code Quality Checklist
**✅ Good practices found**
- Zod validation for env + input schemas.
- Centralized error handler with structured responses.
- RBAC middleware and permission checks.
- Rate limiting per auth/MFA/upload/sms endpoints.
- Slow query logging in DB pool.
- Tests for auth, catalog, settings, PO, GRN, SMS.

**❌ Gaps / violations**
- Dual “monolithic + split” service implementations.
- A few modules still rely on “implicit conventions” rather than shared helpers.
- Inconsistent naming and location of helpers (e.g., route helpers vs service helpers).
- Incomplete cache invalidation for RBAC permission changes.
- Seed workflow not unified (roles/permissions; order matters).

## Detailed Findings

### 1) Dual service entrypoints (High)
**Files:**  
`src/services/product.service.ts` + `src/services/product/*`  
`src/services/purchaseOrder.service.ts` + `src/services/purchaseOrder/*`  
`src/services/goodsReceipt.service.ts` + `src/services/goodsReceipt/*`  
`src/services/stock.service.ts` + `src/services/stock/*`  
`src/services/variant.service.ts` + `src/services/variant/*`  
`src/services/vendor.service.ts` + `src/services/vendor/*`  
`src/services/unit.service.ts` + `src/services/unit/*`  
`src/services/stockLocation.service.ts` + `src/services/stockLocation/*`  
`src/services/auth.service.ts` + `src/services/auth/*`  
`src/services/mfa.service.ts` + `src/services/mfa/*`  
`src/services/admin-users.service.ts` + `src/services/adminUsers/*`  
`src/services/shipping.service.ts` + `src/services/shipping/*`

**Issue:** Two competing structures for the same domain increases maintenance cost and risk of diverging logic.

**Recommendation:** Choose one pattern (prefer `services/<domain>/{read,write,shared}.ts`) and keep only a single entrypoint in `services/<domain>.service.ts` that re‑exports the split modules.

---

### 2) RBAC cache invalidation (High)
**Files:** `src/middleware/authz.ts`, `src/services/rbac.service.ts`

**Issue:** Permissions are cached with TTL only. Role/permission updates won’t invalidate cache immediately.

**Recommendation:** Add explicit invalidation on role/permission updates, or include permission versioning in cache key.

---

### 3) Migration/seed workflow not unified (High)
**Files:** `drizzle/*`, `src/db/migrate.ts`, seed migrations

**Issue:** Seeds (roles/permissions) are spread across migrations. Failures are common if order isn’t controlled.

**Recommendation:**  
- Maintain a **single seed migration** that is idempotent and runs after schema migrations.  
- Document the seed order in README.

---

### 4) Error handling type safety (Medium)
**Files:** `src/middleware/errorHandler.ts`

**Issue:** `err: any` and broad error handling reduces type safety and can hide bugs.

**Recommendation:** Introduce a `AppError` type guard and narrow `unknown` safely.

---

### 5) Query efficiency in catalog read (Medium)
**Files:** `src/services/product/read.ts`

**Issue:** Subqueries for subcategory name, SKU, price, etc. can become expensive on large catalogs.

**Recommendation:** Use joins + indexed columns; cache derived fields if needed.

---

### 6) Helpers location drift (Low)
**Files:** `src/routes/helpers/*`, `src/services/*/shared.ts`

**Issue:** Similar helper logic exists across routes and services with inconsistent naming.

**Recommendation:** Consolidate shared domain helpers under `services/<domain>/shared.ts` and keep route helpers minimal.

---

### 7) Security & secrets management (Medium)
**Files:** `src/config/env.ts`, `src/utils/crypto.ts`

**Issue:** Secret usage is centralized but requires strict operational discipline.

**Recommendation:** Add a short “Secrets & Rotation” section to README and ensure encryption keys are rotated safely.

---

### 8) Testing gaps (Medium)
**Files:** `tests/*`

**Issue:** Good functional coverage, but missing: webhook signature validation, heavy performance/regression tests.

**Recommendation:** Add Supertest coverage for webhook signature checks and k6 for performance.

## Actionable Recommendations
**High Priority**
- Unify service structure (single entrypoint + split modules).
- Make RBAC cache invalidation explicit.
- Standardize seed migration order and document it.

**Medium Priority**
- Refactor catalog read queries to avoid N+1/subquery overhead.
- Strengthen error handler typing.
- Expand tests for webhooks and critical integration points.

**Low Priority**
- Consolidate helpers by domain.
- Add internal docs on secrets rotation and operational workflows.

## Grade
- **Current:** B+
- **Target (after fixes):** A
