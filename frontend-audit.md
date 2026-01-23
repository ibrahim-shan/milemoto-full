# MileMoto Clientside Frontend Audit Checklist

Scope: `milemoto-clientside/src` (app, features, hooks, ui, lib)

## High Priority
- [x] Fix purchase order dialog state reset when switching edit targets or after async defaults load. Evidence: `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx:60`, `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx:103`, `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx:232`. Action: reset state on `purchaseOrder`/`open` and apply default currency when available.

## Medium Priority
- [x] Add server-side search wiring for purchase order dialog pickers (vendors, stock locations, payment methods, inbound shipping methods, taxes, variants) to remove the hard cap. Evidence: `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx:133`, `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx:163`.
- [ ] Replace `LocationPagination` duplication with shared `usePagination`/`PaginationControls`. Evidence: `milemoto-clientside/src/features/admin/settings/location-setup/LocationPagination.tsx:17`, `milemoto-clientside/src/hooks/use-pagination.ts:3`.
- [ ] Consolidate toast system (Sonner vs Radix) and remove the unused stack. Evidence: `milemoto-clientside/src/app/layout.tsx:12`, `milemoto-clientside/src/ui/toast.tsx`, `milemoto-clientside/src/ui/toaster.tsx`, `milemoto-clientside/src/ui/use-toast.ts`.
- [ ] Debounce list search inputs in admin list pages to reduce query spam. Evidence: `milemoto-clientside/src/app/(admin)/admin/grades/page.tsx:142`, `milemoto-clientside/src/app/(admin)/admin/brands/page.tsx:142`, `milemoto-clientside/src/app/(admin)/admin/goods-receipts/page.tsx:78`. Positive example: `milemoto-clientside/src/features/admin/settings/shipping/order-area-table.tsx:42`.

## Low Priority
- [ ] Standardize file naming conventions across shared folders (kebab-case vs PascalCase). Evidence: `milemoto-clientside/src/ui/Tabs.tsx`, `milemoto-clientside/src/ui/Quantity.tsx`, `milemoto-clientside/src/hooks/use-pagination.ts`.
- [ ] Define the boundary for `ui` vs `features` and move domain widgets out of `ui` if needed. Evidence: `milemoto-clientside/src/ui/country-dropdown.tsx`, `milemoto-clientside/src/ui/phone-field.tsx`, `milemoto-clientside/src/ui/timezone-selector.tsx`.
- [ ] Centralize query string building for list endpoints to reduce drift. Evidence: `milemoto-clientside/src/hooks/useVendorQueries.ts:34`, `milemoto-clientside/src/hooks/useBrandQueries.ts:33`, `milemoto-clientside/src/hooks/useGradeQueries.ts:34`.
- [ ] Add frontend tests (no `*.test.*` or `*.spec.*` found under `milemoto-clientside`).

## Duplicate Code Refactors
- [ ] Extract shared list page/table scaffolding (columns, column visibility, filters, table state, pagination). Evidence: `milemoto-clientside/src/app/(admin)/admin/brands/page.tsx:38`, `milemoto-clientside/src/app/(admin)/admin/grades/page.tsx:38`, `milemoto-clientside/src/app/(admin)/admin/categories/page.tsx`.
- [ ] Extract a reusable row actions menu (MoreHorizontal + DropdownMenu items like Edit/Delete/View). Evidence: `milemoto-clientside/src/app/(admin)/admin/brands/page.tsx:275`, `milemoto-clientside/src/app/(admin)/admin/customers/page.tsx:381`, `milemoto-clientside/src/app/(admin)/admin/vendors/page.tsx:335`, `milemoto-clientside/src/app/(admin)/admin/products/page.tsx:452`, `milemoto-clientside/src/app/(admin)/admin/grades/page.tsx:275`, `milemoto-clientside/src/features/admin/collections/CollectionTable.tsx:163`, `milemoto-clientside/src/features/admin/settings/location-setup/CountriesTab.tsx:191`, `milemoto-clientside/src/features/admin/settings/shipping/order-area-table.tsx:205`, `milemoto-clientside/src/features/admin/barcodes/components/BarcodeTable.tsx:244`.
- [ ] Extract a reusable confirm delete dialog (AlertDialog scaffold). Evidence: `milemoto-clientside/src/app/(admin)/admin/brands/page.tsx:331`, `milemoto-clientside/src/app/(admin)/admin/categories/page.tsx:556`, `milemoto-clientside/src/app/(admin)/admin/vendors/page.tsx:391`, `milemoto-clientside/src/app/(admin)/admin/settings/units/page.tsx:242`, `milemoto-clientside/src/app/(admin)/admin/settings/payments/page.tsx:354`, `milemoto-clientside/src/app/(admin)/admin/products/page.tsx:515`.

## Component Decomposition (Large Files)
- [ ] Split `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx` (850 LOC) into smaller components and form hooks.
- [ ] Split `milemoto-clientside/src/ui/sortable.tsx` (831 LOC) into focused modules (contexts, hooks, UI wrappers).
- [ ] Split `milemoto-clientside/src/features/admin/collections/CollectionDialog.tsx` (730 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/settings/sms-gateway/page.tsx` (716 LOC).
- [ ] Split `milemoto-clientside/src/features/admin/settings/location-setup/LocationDialogs.tsx` (679 LOC).
- [ ] Split `milemoto-clientside/src/features/admin/products/components/VariantForm.tsx` (639 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/categories/page.tsx` (581 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/products/page.tsx` (540 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/products/[id]/page.tsx` (495 LOC).
- [ ] Split `milemoto-clientside/src/ui/sortable-upload.tsx` (473 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/customers/page.tsx` (469 LOC).
- [ ] Split `milemoto-clientside/src/app/(admin)/admin/purchase-orders/page.tsx` (452 LOC).

## Optimization Tasks
- [ ] Add `keepPreviousData` or `placeholderData` to list queries for smoother pagination transitions. Evidence: `milemoto-clientside/src/hooks/useShippingQueries.ts` (already uses `placeholderData`) vs other list hooks.
- [ ] Lazy-load heavy admin dialogs or complex UI modules to reduce initial bundle size. Evidence: `milemoto-clientside/src/features/admin/purchase-orders/purchase-order-dialog.tsx`, `milemoto-clientside/src/ui/sortable.tsx`.
