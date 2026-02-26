# Tax System Policy and Phased Implementation (Reusable)

## Purpose
This document defines a reusable, policy-driven tax system architecture for commerce platforms. It is written to be productized and reused across different clients, countries, and business models.

It separates:
- Tax policy decisions (what the system should do)
- Engine behavior (how tax is calculated)
- Integration phases (how to implement it safely)

## Scope
This document is intentionally generic.

It does not assume:
- a specific business type (retail, B2B, COD-only, subscription, etc.)
- a specific framework or language
- a specific database schema
- a specific checkout UX

## Core Principles (Non-Negotiable)
1. Server-authoritative tax
- Final tax must be calculated and validated on the server.
- Frontend only displays quoted results.

2. Single tax engine
- Quote, checkout submit, admin previews, and order recalculation checks must use the same tax engine logic.
- Do not duplicate tax logic in multiple services.

3. Explicit policy
- Tax behavior must be driven by documented policy decisions.
- Jurisdiction, taxable base, stacking, rounding, and fallback behavior must be explicit.

4. Order-time snapshot
- Store what was charged at order time.
- Never recalculate historical order tax from current rules when viewing old orders.

5. Progressive complexity
- Start with a small rule model (for example global + country).
- Extend to region/city/exemptions/classes without rewriting the engine.

## Policy Model (Portable)
The tax engine should be configured by policy, not hidden assumptions.

### Required policy decisions
1. Jurisdiction source
- Shipping address
- Billing address
- Store/origin address
- Hybrid (jurisdiction-specific rules)

2. Rule matching scope
- Global rules
- Country rules
- Region/state rules
- City rules
- Postal code rules

3. Rule combination behavior
- Stacking (sum all applicable rules)
- Exclusive (best match only)
- Priority-based selection
- Compounding (tax on tax, ordered)

4. Taxable base
- Subtotal
- Subtotal minus discounts
- Subtotal plus shipping
- Per-line taxable base with item attributes

5. Fixed tax semantics
- Per order
- Per item
- Per quantity unit

6. Shipping taxability
- Shipping taxable: yes/no
- If yes: globally or by rule/jurisdiction

7. Rounding policy
- Round per line or per total
- Currency precision (not always 2 decimals)
- Tie-breaking method (half-up, bankers rounding, etc.)

8. Fallback behavior
- What happens if jurisdiction is missing or unresolved?
- No tax / global tax only / block checkout / warning only

9. Effective date behavior
- Tax rules can change over time.
- Decide whether quote/submit use "current active" or "active at timestamp" semantics.

## Recommended Policy Decision Matrix (for implementers)
Use this section as a template when onboarding a new client.

- Jurisdiction source: [choose]
- Rule scope levels enabled: [choose]
- Stacking model: [choose]
- Taxable base: [choose]
- Shipping taxable: [choose]
- Fixed tax semantics: [choose]
- Rounding precision and method: [choose]
- Missing jurisdiction behavior: [choose]
- Effective date policy: [choose]
- Historical snapshot strategy: [choose]

## Reference Rule Model (Minimal, Reusable MVP)
This is a generic minimal model that works for many platforms.

### Tax rule fields (conceptual)
- `id`
- `name`
- `status` (`active` | `inactive`)
- `type` (`percentage` | `fixed`)
- `rate` (decimal)
- `scope` (`global` / `country` / `region` / etc.)
- `jurisdictionRef` (nullable for global)
- `validFrom` (optional)
- `validTo` (optional)
- `priority` (optional)
- `compound` (optional)
- `metadata` (optional)

### MVP limitations (acceptable)
- No region/city granularity yet
- No compounding
- No exemptions
- No product tax classes
- No tax-on-shipping flag per rule

## Tax Engine Design (Reusable)
### Engine contract
The engine should be independent of routes/controllers/UI.
It should accept plain inputs and return deterministic outputs.

### Input shape (conceptual)
- `currency`
- `timestamp` (optional but recommended)
- `lineItems[]` (optional in MVP if subtotal-only)
- `subtotal`
- `discountTotal`
- `shippingTotal`
- `jurisdiction`:
  - `countryId` / `countryCode`
  - `regionId` / `regionCode` (optional)
  - `cityId` (optional)
  - `postalCode` (optional)

### Output shape (conceptual)
- `taxableBase`
- `taxLines[]`
  - `ruleId` (nullable if snapshot-only)
  - `name`
  - `type`
  - `rate`
  - `amount`
  - `scope`
  - `jurisdictionRef` (nullable)
- `taxTotal`
- `diagnostics` (optional)
  - matched rule IDs
  - ignored rule IDs
  - rounding metadata

### Engine responsibilities
- Resolve applicable rules from current policy and jurisdiction
- Calculate tax line amounts
- Apply rounding policy
- Return deterministic totals and line breakdowns

### Engine non-responsibilities
- HTTP concerns
- UI formatting
- Persistence details
- Authentication/authorization

## End-to-End Flow (Generic)
1. Admin/operator configures tax rules
2. Rules are validated and activated
3. Quote service calls tax engine with current cart totals + jurisdiction input
4. UI displays tax total (and optionally tax line breakdown)
5. Checkout submit calls the same tax engine again server-side
6. Order stores tax total and tax snapshot lines
7. Customer/admin order views display stored snapshot values

## Admin Requirements (Productized)
### Minimum admin capabilities
- Create/update tax rules
- Activate/deactivate rules
- Scope rule by jurisdiction level (at least global + one geographic level)
- Define percentage/fixed rule type
- Set rate/value

### Recommended admin guardrails
- Prevent obviously duplicate active rules in the same scope (configurable)
- Validate numeric ranges and precision
- Validate date ranges (`validFrom <= validTo`)
- Audit log tax rule changes
- Provide preview/test calculator (future phase)

## Order Snapshot Policy (Critical)
Orders must store the tax that was actually charged.

### Minimum snapshot
- `taxTotal`

### Recommended snapshot
- `taxLines[]` persisted at order time
- Optional `policyVersion`
- Optional jurisdiction snapshot used for calculation

### Why this matters
Tax rules change. Historical orders must remain explainable and auditable.

## Recommended Phased Implementation

## Phase 0: Policy Finalization (Required)
### Objective
Finalize configurable tax policy before code implementation.

### Deliverables
- Completed policy decision matrix
- Written rounding rules
- Written fallback behavior
- Written snapshot policy
- Decision on jurisdiction source

### Exit criteria
- Engineering and product/legal stakeholders agree on policy choices
- No hidden assumptions remain in implementation tickets

## Phase 1: Shared Tax Engine (MVP)
### Objective
Build a reusable server-side tax engine and use it for quote + submit.

### Deliverables
- Tax engine module/service
- Rule resolver for enabled scopes (for example global + country)
- Calculation logic for percentage and fixed rules
- Shared use in quote and submit paths

### Notes
- Keep UI unchanged if needed; start by returning/using `taxTotal`
- Do not add advanced rule types yet

## Phase 2: Tax Breakdown in Quote/API
### Objective
Expose tax line breakdowns for transparency and debugging.

### Deliverables
- Quote response includes `taxLines[]`
- Optional diagnostics metadata in non-production/admin mode
- UI can display breakdown (immediately or later)

## Phase 3: Persist Tax Snapshot Lines on Orders
### Objective
Store full tax breakdown on orders, not only header total.

### Deliverables
- Order tax snapshot storage (normalized table recommended, JSON acceptable as MVP)
- Submit flow persists snapshot lines in transaction
- Historical order views read stored snapshot, not live engine output

### Recommended data shape (conceptual)
- `orderId`
- `ruleId` (nullable)
- `taxName` snapshot
- `taxType` snapshot
- `taxRate` snapshot
- `scope` snapshot
- `jurisdictionRef` snapshot
- `amount`
- `createdAt`

## Phase 4: Admin and Customer Tax Visibility
### Objective
Make stored tax values visible and explainable.

### Deliverables
- Customer order detail shows tax total (and optionally lines)
- Admin order detail shows tax total and tax lines
- Support-friendly explanation fields (rule names, scope)

## Phase 5: Advanced Rule Extensions
### Objective
Extend capabilities without breaking Phase 1-4 behavior.

### Possible extensions
1. Regional/city/postal rules
2. Shipping taxability toggles
3. Rule priorities and compounding
4. Product/category tax classes
5. Exemptions (customer/company level)
6. Effective-date versioned rule resolution
7. Multi-currency precision policies

## Testing Strategy (Reusable)
### Unit tests (high value)
1. No rules matched
2. Global rule only
3. Jurisdiction-specific rule only
4. Global + jurisdiction stacking
5. Fixed + percentage mixed
6. Inactive rules ignored
7. Discounts reduce taxable base (if policy says so)
8. Taxable base floor at zero (if policy says so)
9. Rounding consistency
10. Effective date filtering (if enabled)

### Integration tests
1. Quote and submit return the same result for same inputs and same rules
2. Submit recalculates tax server-side regardless of client-provided totals
3. Rule changes between quote and submit are handled per policy
4. Order snapshot persists tax totals/lines correctly

### Admin tests
1. Rule validation (invalid ranges/dates)
2. Activation/deactivation behavior
3. Duplicate/conflict guardrails (if enabled)

## Observability (Recommended)
### Logs/metrics
- Matched rule IDs during quote/submit (debug or structured logs)
- Tax engine duration
- Quote vs submit tax mismatch events
- Orders with zero tax when jurisdiction is present (monitoring signal)

### Why this matters
Tax issues are difficult to debug without visibility into rule matching and rounding decisions.

## Compliance and Legal Note
This document describes software architecture and policy mechanics, not legal tax advice.
Tax policy choices and rule content should be reviewed by qualified tax/legal advisors for each jurisdiction where the platform operates.

## What Not To Do (Common Mistakes)
- Don’t calculate final tax only in the frontend
- Don’t duplicate tax logic across quote/submit/admin previews
- Don’t recalculate historical order tax from current rules for display
- Don’t hardcode business assumptions inside the engine (for example taxable base, jurisdiction source)
- Don’t add advanced rule dimensions before the core policy and engine are stable

## Implementation Note (for adopters)
When integrating this plan into a specific platform, create a separate implementation mapping document that defines:
- actual database tables and fields
- API endpoints
- code module paths
- selected policy decisions from the matrix
- rollout order for that platform
