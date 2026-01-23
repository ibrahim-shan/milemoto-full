# Product/Stock/PO Review - Work Items

## Schema Integrity
- [x] Remove duplicate FK on `products.subCategoryId` (restrict vs set null) and keep a single rule. `packages/types/src/db.schema.ts` (confirmed single FK in schema)
- [ ] Decide PO shipping method source-of-truth:
  - Option A: replace enum with `shippingMethodId` FK to `shippingmethods`.
  - Option B: keep enum and document why it is not tied to `shippingmethods`.
  - `packages/types/src/db.schema.ts`
- [ ] Ensure `updatedAt` is maintained on status changes (PO submit/approve/cancel; GRN post). Either add DB default with `ON UPDATE` or set explicitly in services.
  - `packages/types/src/db.schema.ts`
  - `milemoto-serverside/src/services/purchaseOrder/write.ts`
  - `milemoto-serverside/src/services/goodsReceipt/write.ts`

## Business Rules / Validation
- [ ] Enforce category/subcategory consistency (subCategory belongs to category) at service layer or DB-level check.
  - `packages/types/src/db.schema.ts`
  - `milemoto-serverside/src/services/product/*`
- [ ] Confirm costing model: current weighted average is global across locations (uses sum of `stocklevels.onHand`). Decide if cost should be per-location.
  - `milemoto-serverside/src/services/goodsReceipt/costs.ts`

## Concurrency & Atomicity
- [ ] Make `onOrder` updates atomic when approving/canceling POs to avoid duplicate inserts under concurrency.
  - `milemoto-serverside/src/services/purchaseOrder/stock.ts`

## Documentation / Alignment
- [ ] Document shipping method behavior for PO vs product (enum vs table) in the project docs.
- [ ] Document inventory valuation method (global weighted average vs per-location).
