# Stock - Completed (Current State)

This file lists stock/inventory functionality that is already implemented and working in the app (based on the current stock routes/services and stock test suite).

## Stock Module (Admin)

Implemented inventory flows for:

- Stock levels listing
- Stock movements listing
- Manual stock adjustments
- Stock transfers between stock locations
- Stock-location CRUD endpoints (used by inventory flows)

## Stock Routes (Admin)

Implemented stock endpoints:

- `GET /api/v1/admin/stock` (stock levels list)
- `GET /api/v1/admin/stock/movements` (stock movements list)
- `POST /api/v1/admin/stock/adjustments` (manual adjustment)
- `POST /api/v1/admin/stock/transfers` (location transfer)

Permissions in use:

- `stock.read`
- `stock_movements.read`
- `stock_movements.manage`

## Stock Levels (Implemented)

- List stock levels with filtering support (via `LevelListQuery`)
- Stock levels update after adjustment and transfer flows
- Stock level records are created/updated per variant and stock location

## Stock Movements (Implemented)

- List stock movements with filtering support (via `MovementListQuery`)
- Movement records are created for stock adjustments
- Movement records are created for transfers
- Transfer flow creates both movement directions:
  - `transfer_out`
  - `transfer_in`

## Manual Stock Adjustment (Implemented)

- Create stock adjustment (`/stock/adjustments`)
- Adjustment writes stock movement entry with type `adjustment`
- Adjustment updates stock level `onHand` quantity
- Adjustment captures audit context from request (user/ip/user-agent) via route -> service flow

## Stock Transfer (Implemented)

- Create stock transfer between two locations (`/stock/transfers`)
- Transfer decrements source location stock
- Transfer increments destination location stock
- Transfer writes stock movement records for both sides of the transfer
- Transfer flow is integrated with stock level listing and stock movement listing

## Stock Locations (Admin Support)

Implemented stock-location endpoints (inventory support module):

- `GET /api/v1/admin/stock-locations`
- `GET /api/v1/admin/stock-locations/:id`
- `POST /api/v1/admin/stock-locations`
- `PUT /api/v1/admin/stock-locations/:id`
- `DELETE /api/v1/admin/stock-locations/:id`

Permissions in use:

- `locations.read`
- `locations.manage`

## Stock + Catalog Integration (Verified in Tests)

Stock test flow verifies inventory operations against real catalog entities:

- Brand
- Category / subcategory
- Grade
- Product
- Product variant
- Stock locations

This confirms stock operations work with real product variants and location records in authenticated admin flows.

## Stock Test Coverage (Current)

Automated coverage is present in:

- `tests/stock/stock.test.ts`

Covered behaviors include:

- Stock adjustment creation and resulting stock level update
- Stock transfer creation and resulting source/destination stock updates
- Stock movements listing including `adjustment`, `transfer_out`, and `transfer_in`

## Inventory Flows Integrated with Purchasing (Cross-Module)

Inventory is also integrated with purchasing/goods receipts (covered in `goods-receipts` tests):

- Goods receipt posting updates stock levels
- Goods receipt posting writes stock movements with type `purchase_receipt`

This confirms the stock module is actively used by purchasing receipt posting flows.
