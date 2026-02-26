# Purchase Orders - Completed (Current State)

This file lists purchase-order functionality that is already implemented and working in the app (based on the current purchase-order routes/services and PO test suite).

## Purchase Order Module (Admin)

Implemented admin purchase-order flows for:

- Create draft purchase orders
- Read/list purchase orders
- Update draft purchase orders
- Status workflow actions (submit/approve/reject/cancel/close)
- PO totals calculation (subtotal, discount, tax, shipping, total)
- PO currency validation
- PO line tax calculation and tax snapshot persistence

## Purchase Order Routes (Admin)

Implemented endpoints:

- `GET /api/v1/admin/purchase-orders` (list)
- `GET /api/v1/admin/purchase-orders/:id` (detail)
- `POST /api/v1/admin/purchase-orders` (create)
- `PUT /api/v1/admin/purchase-orders/:id` (update)
- `POST /api/v1/admin/purchase-orders/:id/submit`
- `POST /api/v1/admin/purchase-orders/:id/approve`
- `POST /api/v1/admin/purchase-orders/:id/reject`
- `POST /api/v1/admin/purchase-orders/:id/cancel`
- `POST /api/v1/admin/purchase-orders/:id/close`

These routes are protected with `purchase_orders.read` / `purchase_orders.manage` permissions.

## Draft Creation & Totals Calculation

Implemented PO draft creation with backend-calculated totals, including:

- `subtotal`
- `discountAmount`
- `taxTotal`
- `shippingCost`
- `total`

Completed behaviors covered by tests:

- Fixed discount totals calculation
- Shipping included in total calculation
- Line tax inclusion in header tax total and final total

## PO Tax Calculation (Backend)

Implemented backend PO tax math for PO lines:

- Percentage tax calculation per line
- Fixed tax calculation per line (per quantity)
- Missing tax rule handling (zero tax)
- Header total calculation from line totals

### Rounding (Implemented)

PO tax math now explicitly rounds to 2 decimals in backend calculations for stable persistence and totals.

Covered by unit tests:

- Line subtotal/tax/line total rounding
- Header subtotal/discount/tax/total rounding

## PO Tax Snapshot on Lines (Implemented)

PO line items now persist tax snapshot metadata (in addition to `taxId` and computed amounts):

- `taxName`
- `taxType`
- `taxRate`

This preserves historical PO tax context even if tax rules change later.

Covered in route tests (create/detail/update assertions).

## Purchase Order Read Flows

Implemented and covered:

- PO list endpoint returns created records
- PO list supports search filtering
- PO detail endpoint returns line items
- PO detail returns PO line tax snapshot fields

## Purchase Order Update Flows

Implemented and covered:

- Update draft PO successfully
- Recalculate totals after update
- Recalculate line tax and header tax after update
- Replace/update PO line tax snapshot fields after changing line tax rule

## Purchase Order Status Workflow (Implemented)

Completed status transitions covered by tests:

- `draft` -> `pending_approval` via submit
- `pending_approval` -> `approved` via approve
- `pending_approval` -> `cancelled` via reject
- `approved` -> `cancelled` via cancel
- `approved` -> `closed` via close

## Purchase Order Status Guards (Implemented)

Completed guard behavior covered by tests:

- Prevent submitting a non-draft PO
- Prevent updating an approved PO
- Prevent closing a PO unless it is in an allowed status (approved / partially received)

## Currency Handling (Purchase Orders)

Implemented PO currency support and validation:

- Selected currency is stored on the PO
- Inactive currencies are rejected for PO creation

## Error Handling (PO Routes)

Completed behaviors covered by tests:

- `404 NotFound` for missing PO detail
- `404 NotFound` for missing PO update
- `400 ValidationError` for invalid PO create payload

## PO Test Coverage (Current)

Automated tests are present and cover PO module behavior in:

- `tests/purchase-orders/totals.test.ts`
- `tests/purchase-orders/status-flow.test.ts`
- `tests/purchase-orders/currency.test.ts`
- `tests/purchase-orders/read-update.test.ts`
- `tests/purchase-orders/errors-and-close.test.ts`
- `tests/unit/purchase-order-taxes.test.ts`

This includes both route/integration-level tests and unit tests for PO tax math/rounding.
