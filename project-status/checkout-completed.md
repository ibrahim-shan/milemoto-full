# Checkout - Completed (Current State)

This file lists checkout/order/tax checkout functionality that is already implemented and working in the app (based on the current routes/services, frontend UI, and k6 verification scripts).

## Checkout Module (Authenticated Customer)

Implemented customer checkout endpoints:

- `POST /api/v1/checkout/quote`
- `POST /api/v1/checkout/submit`

Both checkout endpoints require authenticated users (`requireAuth`).

## Checkout Quote (Implemented)

`/api/v1/checkout/quote` currently supports COD checkout quoting and returns:

- validated cart items snapshot (product, variant, SKU, image, quantity, price, line totals)
- cart warnings and checkout errors
- tax lines (`taxLines[]`)
- totals:
  - `subtotal`
  - `discountTotal`
  - `shippingTotal`
  - `taxTotal`
  - `grandTotal`
- `canPlaceOrder` flag

Completed quote behaviors include:

- cart validation integration
- unsupported payment method rejection (non-COD)
- blocking cart invalid/out-of-stock warnings from quote placement
- tax calculation integration through shared checkout tax engine

## Checkout Submit (Implemented)

`/api/v1/checkout/submit` (COD) is implemented end-to-end and:

- re-validates checkout via quote before submit
- re-validates cart contents and live stock inside transaction
- locks stock rows (`FOR UPDATE`) before finalizing order
- creates order record with shipping/billing snapshots
- creates order items snapshot records
- creates order status history entry
- persists order tax snapshot lines (`ordertaxlines`) when tax exists
- deducts stock and writes stock movements for sale shipment
- clears cart after successful order creation
- optionally saves shipping address back to user account profile

## Order Number & Order Snapshot Persistence

Implemented on submit:

- generated order numbers with collision retry handling
- persisted order totals snapshot (`subtotal`, `taxTotal`, `grandTotal`, etc.)
- persisted order line snapshots (`orderitems`)
- persisted tax line snapshots (`ordertaxlines`)
- persisted shipping and billing address snapshots on the order

This preserves historical checkout values even if products/tax rules change later.

## Checkout Tax Engine (Shared)

A single shared checkout tax engine is implemented in backend (`services/checkout/tax.ts`) and is used by both:

- checkout quote
- checkout submit

Completed tax engine behavior includes:

- loads tax rules from the `taxes` table (admin-managed tax rules)
- filters by:
  - active status
  - country scope (global + country)
  - effective date window (`validFrom` / `validTo`)
- calculates tax lines for percentage and fixed rules
- rounds tax line amounts and totals using configured precision
- returns tax line breakdown + tax total

## Tax Policy Settings Integration (Checkout)

Checkout tax behavior is integrated with dashboard-configured Tax Policy settings (`/admin/settings/tax-policy`).

Implemented policy inputs used by checkout tax engine:

- `jurisdictionSource` (`shipping_country` / `billing_country`)
- `taxableBaseMode` (`subtotal` / `subtotal_minus_discount`)
- `shippingTaxable` (boolean)
- `roundingPrecision`
- `combinationMode` (`stack` / `exclusive`)
- `fallbackMode` (`no_tax` / `block_checkout`)

## Tax Policy Engine Behavior (Implemented)

Completed tax policy behaviors in checkout engine:

- `stack` mode: sums all matched tax rules
- `exclusive` mode: selects one best-matching rule (country-specific preferred over global)
- `block_checkout` fallback mode:
  - blocks when jurisdiction country is required but missing
  - blocks when no matching active tax rule is found
- `no_tax` fallback mode: allows checkout without matching tax rule

## Tax Rules Admin Integration (Checkout Source of Truth)

Checkout tax rules are sourced from admin tax settings (same `taxes` table used by `/admin/settings/taxes`).

Implemented tax rule features used by checkout:

- tax name
- tax type (`percentage` / `fixed`)
- tax rate
- active/inactive status
- country-specific or global scope
- effective dates (`validFrom`, `validTo`)

## Customer Orders API (Post-Checkout)

Implemented authenticated customer order endpoints:

- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`

Completed customer order detail response includes:

- order totals snapshot
- order items snapshot
- shipping/billing address snapshots
- status history
- tax snapshot lines (`taxLines[]`)

## Admin Orders API (Order Management Read)

Implemented admin order read endpoints:

- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:id`

Completed admin order list features:

- pagination
- status filter
- search (order number / shipping name / shipping phone)

Completed admin order detail response includes:

- order totals snapshot
- items
- status history
- shipping/billing snapshots
- tax snapshot lines (`taxLines[]`)

## Frontend Checkout Page (Customer UI)

Implemented customer checkout UI with:

- shipping address form
- billing address form (same-as-shipping toggle)
- payment method selection (COD flow)
- order notes
- save-address-to-account toggle
- quote-based order summary rendering
- submit checkout action

## Checkout UX Improvements (Implemented)

Completed checkout UX improvements include:

- full checkout skeleton state on initial load
- saved shipping address prefill before first quote request
- reduced initial tax/total flicker on refresh by waiting for address prefill before quote
- quote refresh when shipping location fields change

## Order Detail UI (Customer + Admin)

Implemented tax breakdown UI component:

- `OrderTaxLinesBreakdown` (reusable)

Completed usage:

- Customer order detail displays tax snapshot lines
- Admin order detail displays tax snapshot lines
- fallback note shown when `taxTotal > 0` but snapshot lines are absent

## Admin Orders Frontend (Read UI)

Implemented admin orders frontend pages:

- `/admin/orders` list
- `/admin/orders/[id]` detail

Completed admin orders UI capabilities include:

- list/search/status filter/pagination
- order detail totals/items/status history
- tax snapshot line breakdown display

## Checkout / Tax / Order k6 Verification Scripts (Implemented)

Added k6 scripts for functional smoke and performance/load validation:

- `k6/checkout-tax-order-flow.js`
- `k6/checkout-tax-policy-smoke.js`
- `k6/checkout-quote-tax-load.js`
- `k6/_checkout-tax-helpers.js`

Completed k6 coverage includes:

- end-to-end checkout -> order -> order detail tax snapshot flow
- quote tax math assertions (`taxLines` sum vs `taxTotal`, grand total math)
- order tax snapshot assertions
- admin tax policy toggle behavior (`stack` vs `exclusive`)
- tax policy restore in teardown
- quote-load performance test scaffold with tax assertions

## Current Checkout Payment Support (Implemented)

- Cash on Delivery (COD) checkout flow is implemented end-to-end
- Non-COD payment methods are currently rejected at checkout quote/submit layer
