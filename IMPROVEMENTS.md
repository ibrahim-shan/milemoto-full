# MileMoto Codebase Improvements Checklist

**Created:** 2026-02-01  
**Priority:** High → Medium → Low

---

## 🔴 High Priority (Performance & Security)

### Performance

- [x] **Fix N+1 Query Patterns in Product Creation** ✅
  - File: `milemoto-serverside/src/services/product/write.ts`
  - Issue: Sequential inserts in loops for variants, attributes, images
  - Fix: Use batch inserts with `.values([...array])`
  - **Done:** Refactored `createProduct` and `updateProduct` to collect variant images and batch insert

- [x] **Add Maximum Limit to Pagination** ✅
  - Files: `packages/types/src/common.types.ts`
  - Issue: No max limit allows `?limit=100000`
  - Fix: Add `.max(100)` to Zod schemas
  - **Already Done:** `PaginationSchema` already has `.max(100)` on limit field

- [x] **Optimize Frontend Middleware Auth Check** ✅
  - File: `milemoto-clientside/middleware.ts`
  - Issue: Every `/admin` request calls `/api/v1/auth/refresh`
  - Fix: Check JWT expiry client-side first, only refresh if near expiry
  - **Done:** Added `mm_session_info` cookie with role and expiry. Middleware now checks this cookie first and only calls /refresh if session is within 5 minutes of expiry or cookie is missing.

- [ ] **Add Redis Caching Layer**
  - Scope: Categories, brands, currencies, languages (frequently accessed, rarely changed)
  - Fix: Implement cache-aside pattern with TTL

### Security

- [x] **Add Rate Limiting to All Admin Endpoints** ✅
  - File: `milemoto-serverside/src/app.ts`
  - Issue: Only auth routes have rate limiting
  - Fix: Add general rate limiter for `/api/v1/admin/*`
  - **Done:** Added `adminLimiter` (200 req/min per user/IP) to `v1.ts`. Configurable via `RATE_ADMIN_WINDOW_MS` and `RATE_ADMIN_MAX` env vars.

- [x] **Verify File Upload Size Limits** ✅
  - File: `milemoto-serverside/src/middleware/uploader.ts`
  - Check: Ensure multer has explicit file size limits
  - **Already Done:** `uploadJson` has 5MB limit configured (`limits: { fileSize: 5 * 1024 * 1024 }`)

- [x] **Implement JWT Secret Rotation Strategy** ✅
  - Files: `src/config/env.ts`, `src/utils/jwt.ts`
  - Issue: Changing JWT secret invalidates all existing sessions
  - Fix: Support `JWT_ACCESS_SECRET_OLD` and `JWT_REFRESH_SECRET_OLD` env vars
  - **Done:** Verification tries current secret first, falls back to old secret if configured. Allows zero-downtime secret rotation.

---

## 🟡 Medium Priority (Code Quality)

### Reduce Repetitive Code

- [x] **Create Async Route Handler Wrapper** ✅
  - Location: `milemoto-serverside/src/utils/asyncHandler.ts` (new file)
  - Issue: Every route has identical try/catch pattern
  - **Done:** Created `asyncHandler` utility and refactored all 27 admin route files. Eliminates try/catch boilerplate.

- [x] **Create Permission Constants/Enum** ✅
  - Location: `packages/types/src/rbac.permissions.ts` (new file)
  - Issue: Magic strings like `'products.manage'`
  - **Done:** Created `PERMISSIONS` constant with 26 permission strings, `P` shorthand, and `PermissionSlug` type.

- [x] **Create Query String Builder Utility** ✅
  - Location: `milemoto-clientside/src/lib/queryString.ts` (new file)
  - Issue: Every hook manually builds URLSearchParams
  - **Done:** Created `buildQueryString` and `buildUrlWithQuery` utilities. Refactored all 15 query hooks.

### Data Integrity

- [x] **Add Transfer Correlation ID** ✅
  - File: `packages/types/src/db.schema.ts` → `stockmovements` table
  - Issue: Transfer creates 2 records (out/in) with no link
  - **Done:** Added `transferId` (UUID) column with index. Updated transfer service to generate and assign UUID to both movements.

- [x] **Handle Failed Image Deletions** ✅
  - File: `milemoto-serverside/src/services/product/write.ts`
  - Issue: `void Promise.allSettled(...)` silently ignores failures
  - **Done:** Created `deleteImagesWithLogging` that logs failures with context

---

## 🟢 Low Priority (Production Hardening)

### Observability

- [x] **Add Health Check with DB Ping** ✅
  - File: `milemoto-serverside/src/routes/health.route.ts`
  - **Done:** Added `SELECT 1` query. Returns 200 with `database: 'connected'` or 503 with error message

- [x] **Add Structured Error Logging** ✅
  - Scope: Error handler middleware
  - **Done:** Logs stack, userId, IP, sanitized body/query, request context

### Reliability

- [x] **Add Graceful Shutdown Handling** ✅
  - File: `milemoto-serverside/src/server.ts`
  - **Done:** SIGTERM/SIGINT handlers, server.close() for in-flight requests, pool.end() for DB, 30s force timeout

- [x] **Verify Database Connection Pool Size** ✅
  - File: `milemoto-serverside/src/db/pool.ts`
  - **Done:** Made configurable via `DB_POOL_SIZE` env var (default 10, max 100)

### Database

- [x] **Audit Indexes on Join Columns** ✅
  - Tables: `stocklevels`, `stockmovements`, `productvariants`
  - **Done:** All have indexes. Added missing `idxVariantProduct` on `productId`

- [ ] **Consider Full-Text Search for Product Search**
  - Issue: `LIKE '%term%'` doesn't use indexes
  - Fix: MySQL FULLTEXT index or external search (Elasticsearch/Meilisearch)

---

## 📋 Verification Steps

After each fix:
1. [ ] Run tests: `npm -w milemoto-serverside run test`
2. [ ] Run typecheck: `npm -w milemoto-serverside run typecheck`
3. [ ] Run lint: `npm -w milemoto-serverside run lint`
4. [ ] Test manually in dev environment

---

## 📊 Progress Tracker

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| High     | 7     | 6    | 1         |
| Medium   | 5     | 1    | 4         |
| Low      | 6     | 0    | 6         |
| **Total**| **18**| **7**| **11**    |

---

## Notes

- Start with High Priority items for immediate impact
- Some fixes require database migrations (transfer correlation ID)
- Test performance improvements with realistic data volumes
