# Cart - Completed (Current State)

This file lists cart functionality that is already implemented and working in the app (based on the current cart routes/services and frontend cart implementation).

## Cart Module (Authenticated Server Cart)

Implemented authenticated cart endpoints:

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `DELETE /api/v1/cart`
- `POST /api/v1/cart/merge`
- `POST /api/v1/cart/validate`

All cart routes require authentication (`requireAuth`).

## Server Cart Read (Implemented)

`GET /api/v1/cart` returns an enriched server cart with live data:

- cart id
- cart items
- item count
- subtotal
- cart-level warnings

### Enriched cart item data includes

- product/variant identifiers
- product name / slug
- variant name / SKU
- live price
- image resolution with variant-image preference (falls back to product image)
- available stock (summed across all stock locations)
- warning message when applicable

## Cart Availability & Warning Logic (Implemented)

Cart read/validate logic includes warning generation for:

- inactive product / inactive variant (no longer available)
- out-of-stock item
- cart quantity greater than available stock

Warnings are returned at both item and cart level.

## Add to Cart (Server) - Implemented

`POST /api/v1/cart/items` supports adding a product variant to the authenticated user's cart.

Implemented behavior includes:

- variant existence validation
- variant active validation
- product active validation
- live stock availability check before add
- create cart automatically if user has no cart yet
- increment quantity if the variant already exists in cart
- enforce stock limits (`InsufficientStock`)
- enforce max unique items in cart (`MAX_UNIQUE_ITEMS = 50`)
- enforce quantity cap (`MAX_QTY = 999`)
- cart timestamp update
- returns refreshed enriched cart response

## Update Cart Item Quantity (Server) - Implemented

`PATCH /api/v1/cart/items/:id` supports:

- updating quantity for a cart item
- removing item when quantity is `0`
- ownership validation (item must belong to the current user's cart)
- stock limit validation before updating
- quantity cap to `MAX_QTY`
- cart timestamp update
- returns refreshed enriched cart response

## Remove Cart Item (Server) - Implemented

`DELETE /api/v1/cart/items/:id` supports:

- removing a single cart item by id
- ownership validation (item belongs to current user's cart)
- cart timestamp update
- returns refreshed enriched cart response

## Clear Cart (Server) - Implemented

`DELETE /api/v1/cart` supports:

- removing all cart items for the authenticated user
- cart timestamp update when cart exists
- returning an empty cart response payload

## Guest Cart -> Server Cart Merge (Implemented)

`POST /api/v1/cart/merge` merges guest (localStorage) items into the authenticated server cart.

Implemented merge behavior includes:

- auto-create server cart when needed
- validates active variants and active products
- silently skips invalid/unavailable variants
- silently skips out-of-stock variants during merge
- batch stock lookup for merge candidates
- keeps higher quantity when item already exists in server cart (capped to stock)
- enforces max unique cart item limit
- updates cart timestamp
- returns refreshed enriched cart response

## Cart Validation Endpoint (Implemented)

`POST /api/v1/cart/validate` validates the server cart and:

- checks product/variant availability via cart warning logic
- auto-removes items that are no longer available or out of stock
- refetches cart after removals
- returns warnings that indicate removed items

This is used by checkout flows to prevent stale/unavailable items from proceeding.

## Frontend Cart State (Implemented)

A client-side cart context is implemented in `CartProvider` with support for:

- local (guest) cart state
- server cart mode when authenticated
- automatic mode switch on auth token changes
- load cart from server after login
- merge guest cart into server cart after login
- fallback to local cart when logged out
- cross-tab guest cart sync via `storage` event

## Guest Cart Local Storage (Implemented)

Implemented guest cart localStorage behavior includes:

- persistent guest cart storage (`mm_cart_items`)
- stale item cleanup (drop items older than 7 days)
- stale price warning injection after 24h (guest cart only)
- safe localStorage load/parse fallback handling

## Frontend Cart Item Operations (Implemented)

Cart context supports frontend operations:

- add item (local immediate update)
- remove item
- set item quantity
- clear cart

When authenticated, frontend cart operations also sync to server cart endpoints and rehydrate from server responses.

## Quantity / Stock Clamping in Frontend (Implemented)

Frontend cart context includes quantity helpers that:

- normalize quantity values
- clamp quantity to stock when stock is known
- keep quantity within allowed range

This provides immediate UI-side safety before server validation.

## Cart Images (Implemented Behavior)

- Server cart enrichment prefers variant-specific image when available.
- Falls back to product-level image when no variant image exists.
- Variant image is preserved when cart is refreshed from server (including quantity updates).

## Cart Drawer UI (Implemented)

Implemented cart drawer component (`CartDrawer`) includes:

- portal-based slide-in cart drawer UI
- animated open/close with overlay (Framer Motion)
- body scroll lock while open
- escape key to close
- cart items list with image/title/variant/qty/price
- warning display per item
- subtotal display
- checkout button
- go-to-cart button
- remove item action per row

## Cart + Checkout Integration (Implemented)

Cart is integrated into checkout flow and related features:

- checkout quote uses cart validation and cart warnings
- checkout submit revalidates cart and stock in transaction
- cart is cleared after successful checkout submit
- cart API endpoints are used by k6 checkout/tax/order flow scripts

## Cart API Client (Frontend) - Implemented

Implemented frontend cart API helpers (`src/lib/cart.ts`) for:

- fetch server cart
- add item to server cart
- set server cart item quantity
- remove server cart item
- clear server cart
- merge guest cart into server cart

These helpers are used by the cart context and checkout-related flows.

## Cart Verification Coverage (Current)

There is currently no dedicated backend `tests/cart/*` folder.

However, cart behavior is actively exercised in implemented flows and scripts, including:

- checkout flow integration (quote/submit depends on cart validation)
- k6 checkout/tax/order scripts (login -> clear cart -> add item -> quote -> submit)
