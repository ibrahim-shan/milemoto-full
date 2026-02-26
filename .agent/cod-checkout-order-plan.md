# COD-First Checkout & Order Plan (Payment-Ready Architecture)

## Goal
Implement a real checkout + order creation flow using **Cash on Delivery (COD)** first, while designing the system so online payment providers (e.g. Stripe/Paymob/Flutterwave/etc.) can be added later without rewriting core order logic.

## Implementation Status (Current)
### Completed
- Backend `POST /api/v1/checkout/quote` (auth-only, server-authoritative cart validation + totals breakdown)
- Backend `POST /api/v1/checkout/submit` (COD transaction)
  - creates `orders`
  - creates `orderitems`
  - creates initial `orderstatushistory`
  - deducts stock (Option A: deduct on placement)
  - writes stock movements
  - clears cart
- Backend customer order APIs
  - `GET /api/v1/orders`
  - `GET /api/v1/orders/:id`
- DB schema + migration for:
  - `orders`
  - `orderitems`
  - `orderstatushistory`
- Frontend checkout page no longer uses mock data
  - wired to `/checkout/quote`
  - wired to `/checkout/submit`
- Auth-only checkout UX guard
  - guest users are redirected to `/signin?next=/checkout`
  - guest checkout intent preserved through sign-in -> sign-up -> email verification -> sign-in
- Verification link intent support
  - signup can send `next` to backend
  - verification email link includes `next` (e.g. `/verify-email?...&next=/checkout`)

### Partially Completed / Placeholder
- Shipping/tax/discount calculation structure is implemented, but values are placeholders (`0`) in quote/submit
- Checkout UI collects shipping fields, but shipping method selection is still placeholder (`cod-default`)
- Post-order redirect goes to `/account/orders?placed=<id>` (no dedicated confirmation page yet)
- Notifications hooks (mail/SMS on order placed) not implemented for orders yet

### Not Started (from this plan)
- Admin orders backend APIs (`/api/v1/admin/orders...`)
- Admin orders list/detail/status actions UI
- Coupon/discount application in checkout
- Shipping method calculation/selection logic
- Tax calculation logic
- Online payment integrations / webhooks

## Principles
- Order creation and checkout validation must be **server authoritative**.
- Client cart is UX only; server recalculates prices, stock, totals.
- COD is just one **payment method** in a generic payment flow.
- Keep checkout split into clear phases: validate -> quote -> place order.
- Make order lifecycle explicit and auditable.

## Scope (Phase 1)
### In scope
- Checkout validation from authenticated cart ✅
- COD checkout submit ✅
- Order + order items persistence ✅
- Basic order totals (subtotal, shipping, tax placeholder if needed) ✅ (placeholder shipping/tax/discount values)
- Inventory check and stock deduction/reservation strategy (pick one and implement consistently) ✅ (Option A implemented)
- Customer order history + order details API ✅
- Admin orders list + order details + status update basics
- Notifications hooks (optional stub)

### Out of scope (for now)
- Online payment gateway integration
- Refund processing integration
- Shipment carrier integration
- Returns/RMA flows
- Coupon engine (unless already available)

## Admin Dashboard -> Checkout/Order Mapping (Design Driver)
Use the admin dashboard modules as the source of truth for what checkout/order features must exist or be planned.

For each admin module, define:
- what the admin config/manages
- where it appears in storefront/cart/checkout/order UX
- what the backend must validate/enforce server-side
- what snapshot data must be stored on the order

### Core mappings (relevant for COD-first)
#### Discounts (`/admin/discounts`)
- Checkout/cart UX:
  - coupon/promo code input (cart or checkout)
  - applied discount line in totals summary
- Backend requirements:
  - validate code, status, expiry, usage limits, min order, eligibility rules
  - calculate discount server-side only
- Order snapshot:
  - coupon code / promotion identifier
  - discount amount
  - rule snapshot (optional but recommended)
- Phase decision:
  - if discount engine is not ready for checkout MVP, keep `discountTotal=0` but preserve totals structure

#### Taxes (`/admin/settings/taxes`)
- Checkout UX:
  - tax line(s) in summary
- Backend requirements:
  - tax calculation by configured rules (country/region/product/category if applicable)
- Order snapshot:
  - tax amount(s), tax labels/rates used at purchase time
- Phase decision:
  - allowed as placeholder `0` initially, but keep `taxTotal` in model and quote response

#### Shipping (`/admin/settings/shipping`) + Location Setup (`/admin/settings/location-setup`)
- Checkout UX:
  - shipping address form
  - shipping method selection
  - shipping cost in summary
- Backend requirements:
  - available methods based on address/location/rules
  - calculate shipping fee server-side
- Order snapshot:
  - selected shipping method
  - shipping cost
  - full shipping address snapshot

#### Payments (`/admin/settings/payments`)
- Checkout UX:
  - payment method selector (COD only in MVP, but driven by enabled methods)
- Backend requirements:
  - validate selected payment method is enabled/supported
  - route to payment strategy (`cod` now, provider adapters later)
- Order snapshot:
  - payment method code/name
  - payment status fields
  - provider refs (nullable for COD)
- Phase decision:
  - COD can be the only enabled method initially while keeping extensible structure

#### Products / Variants / Stock / Stock Movements / Locations
- Checkout UX:
  - user can place order only for sellable in-stock items
- Backend requirements (must-have for MVP):
  - product active
  - variant active/sellable
  - requested qty <= available stock
  - current server price is used
  - stock deduction (or reservation) + stock movement audit
- Order snapshot:
  - product/variant ids
  - SKU, product name, variant name, image (optional)
  - unit price and line total

#### Customers (`/admin/customers`)
- Checkout UX:
  - auth-only checkout for MVP (recommended)
  - customer contact + address data
- Backend requirements:
  - attach order to authenticated customer
  - preserve contact/address snapshot on order
- Admin expectations:
  - customer profile should later show order history

#### Orders (`/admin/orders`) + Invoices (`/admin/invoices`)
- Checkout must produce data usable by admin workflows:
  - order number
  - order status
  - payment status
  - totals breakdown
  - customer/shipping snapshots
  - item snapshots
- Invoices implication:
  - order model must support invoice generation without recalculating mutable catalog data later

### Important secondary mappings (plan now, implement later if needed)
#### Warranties (`/admin/warranties`)
- If warranties apply to products/order lines:
  - snapshot warranty info on order items
- If optional upsell warranties are planned:
  - add extensible line-item adjustments structure later

#### Reviews (`/admin/reviews`)
- Order lifecycle should eventually support "verified purchase" review eligibility after delivery

#### Mail / SMS Gateway / Message Templates
- Checkout/order events should emit hooks for:
  - order placed
  - order status changed
  - optional admin notifications
- MVP can use stubs/no-op handlers, but event points should exist

#### Currencies / Languages / Site Settings
- Checkout/order presentation depends on:
  - store currency formatting
  - language/localized labels (later)
  - legal/storefront settings texts
- Order records should store currency snapshot used at placement

#### Roles / Users / Security (Admin permissions)
- Admin order management needs clear permissions for:
  - view orders
  - update statuses
  - cancel orders
  - mark COD as paid

### COD MVP feature set derived from current admin modules
Implement these first because they align directly with existing admin areas:
1. Payment method selection (COD only) using payments settings model/shape
2. Shipping address + shipping method + shipping fee calculation hooks
3. Server-authoritative stock/price validation using catalog/inventory modules
4. Order + order item snapshots for admin Orders/Invoices usage
5. Totals structure with `subtotal`, `discountTotal`, `shippingTotal`, `taxTotal`, `grandTotal`
6. Notification hooks (mail/SMS) as stubs or basic implementation

### Design rule (prevents rewrites)
Even if a feature is not enabled yet in checkout UI (coupon input, taxes, multiple payments), the backend quote/order calculation must already return a full totals breakdown and accept an extensible checkout payload. This keeps COD MVP compatible with future payment/coupon rollout.

## Target UX Flow (Customer)
1. User adds items to cart (already exists)
2. User opens `/checkout` (guest users are redirected to `/signin?next=/checkout`) ✅
3. Checkout page loads real cart from backend (`GET /cart`) / server quote-backed summary ✅
4. Checkout page calls server validation/quote endpoint ✅
5. User enters shipping/contact details + selects payment method (`cod`)
6. User clicks `Place Order` ✅
7. Server validates cart again (price/stock/status), creates order, returns order confirmation ✅
8. Client clears cart / refreshes cart, redirects to confirmation page
   - Current implementation redirects to `/account/orders?placed=<id>` ✅ (dedicated confirmation page pending)

## Target Backend Flow (Server)
### Checkout validate/quote
- Input: authenticated user, shipping address, shipping method, payment method (optional), notes
- Reads current server cart
- Recomputes line prices and availability
- Returns:
  - normalized line items
  - warnings/errors
  - subtotal
  - shipping
  - tax (can be 0 initially)
  - grand total
  - `canPlaceOrder`
- Status: ✅ Implemented (`POST /api/v1/checkout/quote`)

### Checkout submit (COD)
- Re-run validation (never trust prior quote)
- Start DB transaction
- Create `order`
- Create `order_items`
- Adjust stock (or create reservation records)
- Persist payment record/state as `pending_cod` (or equivalent)
- Clear cart
- Commit
- Return order summary + order id/number
- Status: ✅ Implemented (`POST /api/v1/checkout/submit`)

## Payment-Ready Design (Important)
Even for COD, structure it like this:
- `paymentMethod`: `cod | card | mobile_money | bank_transfer` (extensible enum/string)
- `paymentStatus`: `unpaid | pending | paid | failed | refunded | partially_refunded`
- `paymentProvider`: nullable (`cod`, `stripe`, etc.)
- `paymentIntentId` / provider reference: nullable

### COD mapping (Phase 1)
- `paymentMethod = 'cod'`
- `paymentStatus = 'unpaid'` (or `pending`)
- `orderStatus = 'placed'` / `pending_confirmation`

This lets future online payments plug into the same order model.

## Recommended Domain Model (Minimum)
### Orders table
- `id`
- `orderNumber` (human-friendly unique)
- `userId`
- `status` (e.g. `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`)
- `paymentMethod`
- `paymentStatus`
- `currency`
- `subtotal`
- `shippingTotal`
- `taxTotal`
- `discountTotal` (default 0)
- `grandTotal`
- `notes` (optional)
- shipping snapshot fields (name/phone/address/city/state/country/zip)
- billing snapshot fields (optional / can mirror shipping)
- `placedAt`
- `createdAt`, `updatedAt`

### Order items table
- `id`
- `orderId`
- `productId` (snapshot link)
- `productVariantId`
- `sku` snapshot
- `productName` snapshot
- `variantName` snapshot
- `unitPrice`
- `quantity`
- `lineTotal`
- optional image snapshot

### Order status history (recommended)
- `id`, `orderId`, `fromStatus`, `toStatus`, `reason`, `actorUserId`, `createdAt`

## API Plan (Phase 1)
### Customer APIs
- `GET /api/v1/checkout/quote` or `POST /api/v1/checkout/quote`
  - Prefer `POST` if sending address/shipping payload
  - Status: ✅ Implemented as `POST /api/v1/checkout/quote`
- `POST /api/v1/checkout/submit`
  - COD placement for now
  - Status: ✅ Implemented
- `GET /api/v1/orders`
  - Authenticated customer order history
  - Status: ✅ Implemented
- `GET /api/v1/orders/:id`
  - Customer own order detail
  - Status: ✅ Implemented

### Admin APIs
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:id`
- `PATCH /api/v1/admin/orders/:id/status`
- (Optional) `POST /api/v1/admin/orders/:id/notes`

## Validation Rules (Server-Authoritative)
### Cart line validation
- Variant exists
- Variant is active/sellable
- Product is active
- Quantity > 0 and <= available stock
- Price is current server price

### Checkout validation
- Valid shipping address fields
- Valid phone/email format
- Supported shipping method
- Supported payment method (`cod` first)
- Cart not empty

### Failure behavior
Return machine-readable errors/warnings per line item, e.g.
- `OUT_OF_STOCK`
- `PRICE_CHANGED`
- `VARIANT_INACTIVE`
- `PRODUCT_INACTIVE`
- `CART_EMPTY`

## Inventory Strategy (Choose and be consistent)
### Option A: Deduct on order placement (simpler, okay for COD MVP)
- On COD submit, decrement available stock immediately
- If order is cancelled later, restock via admin status transition logic

### Option B: Reserve stock, deduct on confirmation/shipment (more robust)
- More complex (reservation tables/expiry)
- Better for online payments and abandoned checkouts

### Recommendation for now
Use **Option A** (deduct on placement) for COD MVP, but isolate stock adjustment in a service so you can replace with reservations later.

## Order Status Lifecycle (Suggested)
- `pending_confirmation` (new COD order)
- `confirmed`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

### Payment status lifecycle (COD MVP)
- `unpaid` -> `paid` (when collected) OR `cancelled`

## Admin Dashboard Requirements (Phase 1)
### Orders list page
- status filter
- search by order number / customer / phone
- created date range filter
- pagination
- total summary chips (counts by status optional)

### Order detail page
- customer info snapshot
- address snapshot
- line items snapshot
- totals
- payment method/status
- order status history
- admin actions (confirm, process, ship, deliver, cancel)

## Frontend Checkout Page (Phase 1)
Replace current mock data in:
- `milemoto-clientside/src/app/(store)/checkout/page.tsx`
- Status: ✅ Replaced with API-backed checkout client

### Flow
- Load cart/quote summary from backend ✅ (quote-driven summary)
- Load quote/validation summary ✅
- Collect shipping/contact fields
- Payment method selector (default `Cash on Delivery`) ✅
- Place order button ✅
- Success redirect to confirmation page
  - Current: `/account/orders?placed=<id>` ✅
  - Dedicated confirmation page: pending

### UX requirements
- show line-level warnings (price changed, qty reduced) ✅
- disable submit while request in flight ✅
- idempotent submit protection (double-click safe) ✅ (client-side submit lock; server idempotency key still pending)

## Service Layer Design (Recommended)
Create dedicated modules instead of stuffing into route files:
- `services/checkout/quote.ts`
- `services/checkout/submit.ts`
- `services/orders/read.ts`
- `services/orders/write.ts`

Shared helpers:
- cart-to-order normalization
- totals calculation
- stock validation
- status transition rules

## Security / Integrity Notes
- Authenticate all checkout/order routes
- Use DB transactions for submit
- Enforce ownership on customer order reads
- Log order creation + status changes to audit log
- Add idempotency key support later for online payments (optional for COD MVP but structure-ready)

## Migration / Data Tasks
### New schema likely needed
- `orders`
- `order_items`
- `order_status_history` (recommended)
- optional `order_payments` (can defer but recommended if you want payment-provider-ready design)

### Optional but useful indexes
- `orders(userId, createdAt)`
- `orders(status, createdAt)`
- `orders(orderNumber)` unique
- `order_items(orderId)`
- `order_items(productVariantId)`

## Implementation Order (Practical)
1. DB schema + migrations for orders/order_items/status history ✅
2. Backend checkout quote endpoint (reads cart, validates, returns totals) ✅
3. Backend checkout submit endpoint (COD only, transaction) ✅
4. Backend customer order APIs (`GET /orders`, `GET /orders/:id`) ✅
5. Replace checkout mock page with real API flow ✅
6. Add order confirmation page
7. Admin orders list/detail/status actions (replace placeholder)
8. Add notifications hooks (email/SMS stubs or basic implementation)

## Definition of Done (COD MVP)
- Customer can place a real order using COD
- Order is persisted with item snapshots and totals
- Stock is updated consistently
- Cart is cleared after successful order placement
- Customer can view order history/details
- Admin can list and update order statuses
- All critical validations happen server-side
- Checkout UI no longer uses mock cart data

### COD MVP Progress (Current)
- Customer can place a real order using COD ✅
- Order is persisted with item snapshots and totals ✅
- Stock is updated consistently ✅ (deduct on placement implemented)
- Cart is cleared after successful order placement ✅
- Customer can view order history/details ✅ (API implemented)
- Admin can list and update order statuses ⏳ Pending
- All critical validations happen server-side ✅ (quote + submit validation)
- Checkout UI no longer uses mock cart data ✅

## Future Payment Integration Path (After COD)
1. Add payment provider adapter interface
2. Add `payment_intents` / `order_payments` records if not already added
3. Implement `card` payment method using same checkout submit flow:
   - create order in pending state
   - create payment intent
   - confirm via webhook
   - transition payment/order status
4. Reuse same admin and customer order UIs

## Open Questions (Resolve before implementation)
- Will checkout be guest-enabled later, or auth-only for now?
- How is shipping fee calculated (flat / area-based / method-based)?
- Tax rules active now or later?
- Should COD orders auto-confirm or require admin confirmation?
- When exactly should stock be deducted for COD (placement vs confirmation)?
- Do you need order cancellation by customer in MVP?
