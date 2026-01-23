# Types Package QA Review (packages/types/src) — Issues & Fix Plan (Target: Grade A)

Scope: `packages/types/src/*` only.

This document lists observed problems (type drift, validation gaps, maintainability issues) and concrete fixes to reach “Grade A”.

---

## 1) Correctness & Schema Drift (Highest Priority)

### 1.1 User status enum mismatch (DB vs API vs UI)

- **Where**
  - DB: `packages/types/src/db.schema.ts` → `users.status` is `["active", "inactive", "blocked"]`
  - API/UI: `packages/types/src/user.types.ts` → `status: z.enum(["active", "disabled"])`
- **Impact**
  - Validation rejects real DB values (`inactive`, `blocked`).
  - Frontend/backends can silently diverge and produce hard-to-debug runtime issues.
- **Fix**
  - Decide the canonical business states.
  - Recommended: align API with DB:
    - Change `packages/types/src/user.types.ts` to `z.enum(["active","inactive","blocked"])`.
    - Update any frontend labels to display “Inactive/Disabled” while storing `inactive` in data.
  - If you truly want `disabled`, then change DB enum + migrations + services to use `disabled` (bigger change).

### 1.2 `PermissionResponse` requires `updatedAt` but `permissions` table has no `updatedAt`

- **Where**
  - DB: `packages/types/src/db.schema.ts` → `permissions` has `createdAt` only.
  - API types: `packages/types/src/rbac.types.ts` → `PermissionResponse extends ApiModel<Permission>` which requires `createdAt` + `updatedAt`.
- **Impact**
  - Services must invent `updatedAt` or cast types, defeating “typed query builder catches drift”.
- **Fix (pick one)**
  - **Option A (recommended): add `updatedAt` column**
    - Add `updatedAt` to `permissions` in `packages/types/src/db.schema.ts`.
    - Add SQL migration to add `updatedAt` and set it to `CURRENT_TIMESTAMP` with `ON UPDATE`.
  - **Option B: change response type**
    - Replace `ApiModel<Permission>` with a custom response type that does not require `updatedAt`.

### 1.3 Product variant input schema stricter than DB

- **Where**
  - `packages/types/src/product.types.ts` → `ProductVariantSchema` requires:
    - `barcode` (min 1)
    - `costPrice` (number)
    - `idealStockQuantity` (min 0)
  - DB: `packages/types/src/db.schema.ts` → `productvariants.barcode` nullable, `costPrice` nullable, `idealStockQuantity` nullable.
- **Impact**
  - Zod rejects valid payloads that DB supports.
  - Forces UI to provide fields you may not want required.
- **Fix**
  - Align Zod requirements with business rules (not necessarily DB).
  - Recommended default:
    - `barcode`: `z.string().min(1).optional().nullable()` (or allow empty string and normalize).
    - `costPrice`: `z.coerce.number().min(0).optional().nullable()`.
    - `idealStockQuantity`: `z.number().int().min(0).optional().nullable()`.

### 1.4 Date handling inconsistent in DTOs (string) vs DB (Date)

- **Where**
  - `ApiModel<T>` enforces API `createdAt/updatedAt` as strings (`packages/types/src/common.types.ts`).
  - Several request DTOs use `z.string().optional()` for dates (ex: `packages/types/src/purchaseOrder.types.ts`), while Drizzle schema uses `date()`/`datetime()` → `Date | null`.
- **Impact**
  - Service layer repeatedly needs manual parsing/conversion.
  - Easy to miss conversions and ship runtime errors.
- **Fix**
  - Establish a standard:
    - API request dates use ISO string/date-only string.
    - Add shared Zod helpers for date parsing/validation (see section 2.2).
  - Document required formats (date-only vs datetime).

### 1.5 Decimal / money fields inconsistent (number vs string)

- **Where**
  - DB uses `decimal(...)` in many places; Drizzle may represent as `string` or `number` depending on config.
  - Some response DTOs force strings (ex: `packages/types/src/purchaseOrder.types.ts`), others use numbers (ex: `packages/types/src/currency.types.ts` exchangeRate as number).
- **Impact**
  - Frontend formatting and calculations become error-prone.
  - Service code ends up casting frequently.
- **Fix**
  - Pick a single rule and apply across all API responses:
    - **Option A:** API always returns money as **string** (safe for precision).
    - **Option B:** API always returns money as **number** and enforce rounding/scale consistently (simpler UX, risk precision drift).
  - Update all `*Response` interfaces accordingly and adjust services.

---

## 2) Validation, Normalization & Zod Best Practices

### 2.1 Missing normalization (trim/lowercase) causes duplication edge cases

- **Where**
  - Many `name`, `code`, `slug` schemas accept leading/trailing spaces without trimming (various files).
- **Impact**
  - “Same name but with spaces” bypasses duplicate checks unless every service normalizes.
- **Fix**
  - Add a shared helper:
    - `const zTrimmed = z.string().transform(s => s.trim())`
    - `const zLowerTrimmed = z.string().transform(s => s.trim().toLowerCase())`
  - Apply to all name/code/slug inputs where business expects normalization.

### 2.2 Date validators should be shared and strict

- **Goal**
  - Prevent invalid dates like `2025-12-07T00:00:00.000Z` being used in `<input type="date">`.
- **Fix**
  - Add shared Zod helpers in a new file (example `packages/types/src/zod.helpers.ts`):
    - `DateOnlyStringSchema` (regex `YYYY-MM-DD` + real date check)
    - `IsoDateTimeSchema` (for timestamps)
  - Use them in PO/GRN schemas instead of `z.string()`.

### 2.3 Prefer `z.coerce.number()` consistently for numeric form inputs

- **Where**
  - Some schemas use `z.number()` while UI forms often submit strings.
- **Fix**
  - Standardize:
    - Use `z.coerce.number()` for all numeric inputs coming from forms/querystrings.
    - Use `z.number()` only for internal programmatic inputs.

### 2.4 Avoid “allow empty string OR email/url” unless it’s normalized

- **Where**
  - `packages/types/src/vendor.types.ts`: `email` and `website` allow `""`.
- **Fix**
  - Prefer `optional().nullable()` and normalize `"" -> null` at validation:
    - `z.string().email().optional().or(z.literal("")).transform(v => v === "" ? null : v)`

---

## 3) Maintainability & Structure

### 3.1 `db.schema.ts` is too large (review/merge pain)

- **Impact**
  - Hard to track changes and audit constraints.
- **Fix**
  - Split schema into modules (example):
    - `db/schema/auth.schema.ts`, `db/schema/catalog.schema.ts`, `db/schema/procurement.schema.ts`, etc.
  - Re-export from `db.schema.ts` to preserve import paths (or update imports).

### 3.2 Separate DB types from API DTO exports (bundle hygiene)

- **Problem**
  - `packages/types/src/index.ts` exports DB schema + relations + db types together with API DTOs.
  - Frontend imports can accidentally pull server-only types/relations.
- **Fix**
  - Create sub-entrypoints:
    - `packages/types/src/api/index.ts` (DTOs + response interfaces + Zod)
    - `packages/types/src/db/index.ts` (schema + relations + inferred db types)
  - Keep `packages/types/src/index.ts` for backend-only “full export” if needed.

---

## 4) Performance Considerations (Types-level)

### 4.1 Tree-shaking risk from monolithic exports

- **Fix**
  - Same as 3.2 (sub-entrypoints) to reduce frontend bundle and TS compile load.

### 4.2 Avoid generating `drizzle-zod` schemas for everything if unused

- **Where**
  - `packages/types/src/db.types.ts` creates `createInsertSchema/createSelectSchema` for many tables.
- **Fix**
  - If these schemas are not used at runtime, consider exporting only inferred types and generating Zod schemas selectively.

---

## 5) Security / Hardening

### 5.1 Centralize “safe string” constraints

- **Fix**
  - Add max lengths for fields that go into DB columns (where missing).
  - Ensure `slug`, `code` have restricted patterns where required.

### 5.2 Avoid relying on service-layer-only uniqueness checks

- **Fix**
  - Keep DB unique indexes as the source of truth (already mostly done).
  - Ensure schemas normalize (trim/lowercase) so uniqueness behaves consistently.

---

## 6) Tests (Currently Missing)

### 6.1 Add tests for Zod schemas (recommended)

- **Add**
  - A small `packages/types` test suite that checks:
    - User status accepts DB states.
    - Product variant fields optionality matches expectation.
    - Date-only validators accept/deny correct formats.
    - Normalization transforms whitespace as intended.
- **Why**
  - Prevent regressions after migrations/refactors (especially Drizzle schema shifts).

---

## 7) Documentation

### 7.1 Add a short README for `packages/types`

- Include:
  - “DB model vs API model” rule (`Date` in DB, ISO `string` in API).
  - Decimal/money representation rules.
  - Guidelines for adding new tables/types (update schema + migrations + DTOs).

---

## Suggested “Grade A” Checklist

- [x] Align user status enums (remove `disabled` drift).
- [x] Fix permissions `updatedAt` mismatch (schema + migration OR response type).
- [x] Align product variant DTO required/optional fields with business rules.
- [x] Standardize date-only vs datetime formats with shared Zod helpers.
- [x] Standardize money fields representation in API (string vs number).
- [x] Add normalization helpers (trim/lowercase) and apply to relevant schemas.
- [x] Split exports (`api` vs `db`) to avoid leaking DB internals into frontend bundles.
- [x] Add minimal tests for schema validation & normalization (expanded smoke coverage across most DTO schemas).
- [x] Add `packages/types/README.md`.

## Notes (Consistency Pass)

- `PaginationSchema.search` now uses `TrimmedStringSchema` to avoid whitespace-only search values.
- Standardized common required-field messages (e.g. `Name is required`, `Slug is required`, `Country is required`) across key create DTOs.
- RBAC `PermissionSchema`/`RoleSchema` now uses normalization helpers and `IsoDateTimeStringSchema` for timestamps.
- Branding URLs now validate via shared `NullableUrlSchema` (supports `null` and trims).
