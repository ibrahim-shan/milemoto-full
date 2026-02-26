# Goods Receipts - Completed (Current State)

This file lists goods-receipt functionality that is already implemented and working in the app (based on the current goods-receipt routes/services and test suite).

## Goods Receipts Module (Admin)

Implemented admin goods receipt (GRN) flows for:

- Create draft goods receipts against purchase orders
- Read/list goods receipts
- Update draft goods receipts
- Post goods receipts to inventory
- Update purchase order receiving status from posted receipts
- Write stock movements and update stock levels from posted receipts

## Goods Receipt Routes (Admin)

Implemented endpoints:

- `GET /api/v1/admin/goods-receipts` (list)
- `GET /api/v1/admin/goods-receipts/:id` (detail)
- `POST /api/v1/admin/goods-receipts` (create draft)
- `PUT /api/v1/admin/goods-receipts/:id` (update draft)
- `POST /api/v1/admin/goods-receipts/:id/post` (post to stock)

These routes are protected with `goods_receipts.read` / `goods_receipts.manage` permissions.

## Draft Goods Receipt Creation

Implemented create-draft GRN behavior includes:

- Validates purchase order exists
- Allows GRN creation only for PO statuses:
  - `approved`
  - `partially_received`
- Validates PO has lines
- Validates GRN has at least one line
- Validates each GRN line belongs to the specified PO
- Validates non-negative `receivedQty` / `rejectedQty`
- Validates line quantities do not exceed PO remaining quantity
- Skips zero-zero lines and requires at least one non-zero line
- Generates GRN number
- Stores GRN header and line rows

## Goods Receipt Draft Update

Implemented update behavior includes:

- Only `draft` goods receipts can be updated
- Revalidates PO line ownership and remaining quantities
- Rewrites GRN line rows after validation
- Supports updating note and line quantities
- Supports batch/serial/expiration line fields

## Goods Receipt Posting (Inventory Integration)

Implemented post-to-stock behavior includes:

- Only `draft` goods receipts can be posted
- Revalidates PO status before posting (`approved` / `partially_received`)
- Revalidates remaining quantity at post time
- Updates PO line `receivedQty` / `rejectedQty`
- Updates PO status to:
  - `partially_received` when remaining qty still exists
  - `fully_received` when all lines are fully processed
- Applies stock movements for received quantities
- Updates stock levels (`onHand`) for the received product variants
- Writes stock movement records with type `purchase_receipt`
- Updates goods receipt status to `posted`
- Stores posting metadata (`postedByUserId`, `postedAt`)

## Product Cost Update on Receipt Posting

Implemented cost update integration during GRN posting:

- Receipt posting updates product costs using received quantities and PO line unit cost (`updateProductCosts`)

## Goods Receipt Read Flows

Implemented and covered:

- Paginated GRN list endpoint
- GRN list search support (GRN number / note)
- GRN list filter by `purchaseOrderId`
- GRN detail endpoint returns header + lines

## Quantity / Remaining Validation (Implemented)

Completed validation behavior includes:

- Prevents `receivedQty + rejectedQty` from exceeding PO remaining quantity
- Prevents creating or updating GRNs with no effective quantities
- Prevents posting invalid GRN lines if PO remaining quantity changed before posting

## Goods Receipts + Purchase Orders Integration

Implemented and verified integration flow:

- Create approved PO
- Create first GRN and post -> PO becomes `partially_received`
- Create final GRN and post -> PO becomes `fully_received`

## Stock Integration (Verified in Tests)

After posting a GRN:

- `stocklevels` are increased by received quantity
- `stockmovements` rows are created
- Movement type is `purchase_receipt`

## Goods Receipts Test Coverage (Current)

Automated test coverage is present in:

- `tests/goods-receipts/flow.test.ts`

This flow test covers:

- Draft GRN creation
- Over-receipt validation failure
- List GRNs
- Get GRN detail
- Update draft GRN
- Post GRN
- PO status changes (`partially_received` -> `fully_received`)
- Stock level and stock movement updates
