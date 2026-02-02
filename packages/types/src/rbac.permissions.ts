/**
 * RBAC Permission Constants
 *
 * Use these constants instead of magic strings for type safety and easier refactoring.
 *
 * @example
 * // Before:
 * requirePermission('products.manage')
 *
 * // After:
 * requirePermission(P.PRODUCTS_MANAGE)
 */

export const PERMISSIONS = {
    // Brands
    BRANDS_READ: 'brands.read',
    BRANDS_MANAGE: 'brands.manage',

    // Categories
    CATEGORIES_READ: 'categories.read',
    CATEGORIES_MANAGE: 'categories.manage',

    // Collections
    COLLECTIONS_READ: 'collections.read',
    COLLECTIONS_MANAGE: 'collections.manage',

    // Customers
    CUSTOMERS_READ: 'customers.read',
    CUSTOMERS_MANAGE: 'customers.manage',

    // Goods Receipts
    GOODS_RECEIPTS_READ: 'goods_receipts.read',
    GOODS_RECEIPTS_MANAGE: 'goods_receipts.manage',

    // Grades
    GRADES_READ: 'grades.read',
    GRADES_MANAGE: 'grades.manage',

    // Locations (Stock Locations)
    LOCATIONS_READ: 'locations.read',
    LOCATIONS_MANAGE: 'locations.manage',

    // Products
    PRODUCTS_READ: 'products.read',
    PRODUCTS_MANAGE: 'products.manage',

    // Purchase Orders
    PURCHASE_ORDERS_READ: 'purchase_orders.read',
    PURCHASE_ORDERS_MANAGE: 'purchase_orders.manage',

    // RBAC (Roles & Permissions)
    RBAC_READ: 'rbac.read',
    RBAC_MANAGE: 'rbac.manage',

    // Settings (general)
    SETTINGS_READ: 'settings.read',
    SETTINGS_MANAGE: 'settings.manage',

    // Stock
    STOCK_READ: 'stock.read',
    STOCK_MOVEMENTS_READ: 'stock_movements.read',
    STOCK_MOVEMENTS_MANAGE: 'stock_movements.manage',

    // Users
    USERS_READ: 'users.read',
    USERS_MANAGE: 'users.manage',

    // Variants
    VARIANTS_READ: 'variants.read',
    VARIANTS_MANAGE: 'variants.manage',

    // Vendors
    VENDORS_READ: 'vendors.read',
    VENDORS_MANAGE: 'vendors.manage',

    // Warranties
    WARRANTIES_READ: 'warranties.read',
    WARRANTIES_MANAGE: 'warranties.manage',
} as const;

/** Type for all valid permission slug strings */
export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Shorthand alias for PERMISSIONS */
export const P = PERMISSIONS;
