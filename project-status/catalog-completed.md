# Catalog - Completed (Current State)

This file lists catalog features that are already implemented and working in the app (based on the current catalog routes/services and catalog test suite).

## Catalog Master Data Modules (Admin)

Implemented admin CRUD flows for:

- Brands
- Categories (root + subcategories)
- Grades
- Warranties
- Variant definitions and variant values (attribute options)
- Products
- Collections (manual collections)

## Brands (Admin)

- Create brand (`POST /api/v1/admin/brands`)
- List brands (`GET /api/v1/admin/brands`)
- Get brand by id (`GET /api/v1/admin/brands/:id`)
- Update brand (`PUT /api/v1/admin/brands/:id`)
- Delete brand (`DELETE /api/v1/admin/brands/:id`)

## Categories (Admin)

- Create root category
- Create subcategory using `parentId`
- List categories (paginated admin list)
- Get category tree (`/tree`)
- Get flat category list for dropdowns (`/all`)
- Get category by id
- Update category
- Delete category (including parent/child delete sequence handling in tested flow)

## Category Hierarchy Rules (Implemented)

- Parent/child category structure is supported via `parentId`
- Root categories are used as parents for subcategories in admin flows
- Category dropdown/tree endpoints exist for admin UI usage

## Category Images (Parent Categories)

Implemented parent-category image support:

- Category `imageUrl` field added and returned in category responses
- Admin category dialog supports image upload via `SortableImageUpload` (`maxFiles=1`)
- Subcategories do not use images in the admin UI
- Backend enforces parent-only category images
- When converting a root category into a subcategory, image is auto-cleared

## Grades (Admin)

- Create grade
- List grades
- Get grade by id
- Update grade
- Delete grade

## Warranties (Admin)

- Create warranty
- List warranties
- Get warranty by id
- Update warranty
- Delete warranty

## Variant Definitions (Admin)

- Create variant definition with initial values (e.g. Color -> Red)
- List variants
- Get variant by id
- Add variant value to an existing variant definition
- Update variant value
- Delete variant value
- Delete variant definition

## Products (Admin)

- Create product with:
  - brand
  - category + subcategory
  - grade
  - base images
  - initial variants
- List products
- Get product by id (detail endpoint)
- Update product
- Delete product
- List all product variants (`/api/v1/admin/products/variants`)

## Product-Catalog Relationships (Implemented)

- Products can be linked to:
  - brand
  - root category
  - subcategory
  - grade
- Product creation supports variant payloads during create flow
- Product detail endpoint returns variant data used by admin/test flows

## Collections (Admin)

Manual collections:

- Create manual collection
- List collections
- Get collection by id
- Update collection
- Delete collection
- List products assigned to a collection
- Add product variants to a manual collection
- Remove product variant from a manual collection

Collection preview behavior:

- Preview endpoint exists (`/preview`)
- Manual collection preview rejects with expected error message (preview is for automatic collections)

## Catalog Permissions (RBAC Usage in Tested Flows)

Catalog test setup exercises permission-based access for resource groups including:

- brands
- categories
- grades
- products
- variants
- collections
- warranties

This confirms catalog endpoints are working with catalog-specific read/manage permissions in authenticated admin flows.

## Storefront Category Usage (Catalog Integration)

- Storefront filters endpoint returns category filters based on active products
- Home page “Shop By Categories” now renders parent categories dynamically from storefront filters
- Storefront category filter response includes category `imageUrl` for category cards

## Catalog Test Coverage (Catalog Folder)

Automated tests are present and cover implemented flows for:

- `brands.test.ts`
- `categories.test.ts`
- `collections.test.ts`
- `grades.test.ts`
- `products.test.ts`
- `variants.test.ts`
- `warranties.test.ts`

These tests validate main CRUD and relationship flows across catalog admin modules.
