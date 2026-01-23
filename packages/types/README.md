# `@milemoto/types`

Shared types + validation for Milemoto (monorepo). This package is used by both:
- `milemoto-serverside` (backend)
- `milemoto-clientside` (admin UI)

It contains:
- Zod schemas + DTO types (request/query validation)
- API response typing conventions
- Drizzle schema/relations for the database (backend only)

## Entry points (important)

Use the smallest entrypoint you need:

- **Frontend / shared DTOs:** `@milemoto/types/api`
  - Zod schemas, DTO types, response types, helpers.
  - Does **not** export Drizzle DB schema.

- **Backend DB schema:** `@milemoto/types/db`
  - Drizzle schema + relations + inferred DB types.
  - Backend only.

- **Legacy / everything:** `@milemoto/types`
  - Re-exports both `api` and `db`.
  - Prefer `api`/`db` to keep imports clean.

## Conventions

### Dates

- **DB layer (Drizzle):** `Date` / `Date | null` for `datetime/date` columns.
- **API layer (DTOs/responses):**
  - `createdAt` / `updatedAt` are **ISO datetime strings**.
  - Date-only fields (used by `<input type="date">` and `DATE` columns) must be **`YYYY-MM-DD`**.

Shared validators:
- `DateOnlyStringSchema`, `OptionalDateOnlyStringSchema`
- `IsoDateTimeStringSchema`

### Money / decimals

API money fields are standardized as **numbers** (not strings), and Drizzle decimals use `mode: "number"` in schema where applicable.

If you add new money/decimal fields, keep the representation consistent across:
1) DB schema (`packages/types/src/db.schema.ts`)
2) DTO schemas (Zod)
3) Service mapping
4) UI formatting

### String normalization

Many inputs are normalized in Zod (trim + case normalization) to avoid “duplicate but with spaces/casing”.

Shared helpers:
- `TrimmedStringSchema`
- `LowerTrimmedStringSchema`
- `UpperTrimmedStringSchema`
- `OptionalEmailSchema`
- `OptionalUrlSchema`

## Making schema changes (workflow)

When you add/remove/rename a DB column:
1) Update SQL migrations in `milemoto-serverside/migrations/`
2) Update Drizzle schema in `packages/types/src/db.schema.ts` (and relations if needed)
3) Run migrations (server-side) and restart the backend
4) Fix services/types until `typecheck` catches no drift

The goal is: **DB schema ↔ Drizzle schema ↔ DTO schemas are always aligned**.

## Tests (Node test runner)

This package uses `node:test` via `tsx` (no jest/vitest needed here).

Run from repo root:
```bash
cd packages/types
npm run test
```

Or via workspaces:
```bash
npm -w @milemoto/types run test
```

Tests live in `packages/types/tests/` and focus on:
- Zod schema correctness
- normalization behavior
- date-only vs datetime validation
- numeric coercion for form inputs

