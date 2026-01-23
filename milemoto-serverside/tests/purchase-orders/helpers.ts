import crypto from 'node:crypto';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { logger } from '../../src/utils/logger.js';
import {
  brands,
  categories,
  currencies,
  goodsreceipts,
  grades,
  paymentmethods,
  productvariants,
  products,
  purchaseorderlines,
  purchaseorders,
  stocklevels,
  stocklocations,
  stockmovements,
  vendors,
} from '@milemoto/types';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';
import type { PermissionSeed } from '../catalog/helpers.js';

export type PurchaseOrderFixtures = {
  accessToken: string;
  currencyId: number;
  vendorId: number;
  paymentMethodId: number;
  stockLocationId: number;
  brandId: number;
  rootCategoryId: number;
  subCategoryId: number;
  gradeId: number;
  productId: number;
  variantId: number;
  purchaseOrderIds: number[];
  authCleanup: { userIds: number[]; roleIds: number[]; permissionIds: number[] };
};

export async function setupPurchaseOrderFixtures(
  extraPermissions: PermissionSeed[] = []
): Promise<PurchaseOrderFixtures> {
  const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };
  const basePermissions: PermissionSeed[] = [
    { slug: 'purchase_orders.read', description: 'View purchase orders', resourceGroup: 'Purchasing' },
    { slug: 'purchase_orders.manage', description: 'Manage purchase orders', resourceGroup: 'Purchasing' },
    { slug: 'vendors.manage', description: 'Manage vendors', resourceGroup: 'Purchasing' },
    { slug: 'payment_methods.manage', description: 'Manage payment methods', resourceGroup: 'Settings' },
    { slug: 'locations.manage', description: 'Manage locations', resourceGroup: 'Settings' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
    { slug: 'brands.manage', description: 'Manage brands', resourceGroup: 'Catalog' },
    { slug: 'categories.manage', description: 'Manage categories', resourceGroup: 'Catalog' },
    { slug: 'grades.manage', description: 'Manage grades', resourceGroup: 'Catalog' },
    { slug: 'products.manage', description: 'Manage products', resourceGroup: 'Catalog' },
    { slug: 'products.read', description: 'View products', resourceGroup: 'Catalog' },
  ];
  const admin = await createCatalogAdmin([...basePermissions, ...extraPermissions]);

  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);

  const accessToken = admin.accessToken;
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

  const currencyCode = suffix.slice(0, 3);
  const currencyRes = await request(app)
    .post('/api/v1/admin/currencies')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `PO Currency ${suffix}`,
      code: `P${currencyCode}`,
      symbol: '$',
      exchangeRate: 1.0,
      status: 'active',
    });
  if (currencyRes.status !== 201) {
    throw new Error(`Failed to create currency: ${currencyRes.status}`);
  }
  const currencyId = Number(currencyRes.body.id);

  const vendorRes = await request(app)
    .post('/api/v1/admin/vendors')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Vendor ${suffix}`,
      country: 'US',
      status: 'active',
    });
  if (vendorRes.status !== 201) {
    throw new Error(`Failed to create vendor: ${vendorRes.status}`);
  }
  const vendorId = Number(vendorRes.body.id);

  const methodRes = await request(app)
    .post('/api/v1/admin/payment-methods')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: `Wire ${suffix}`, status: 'active' });
  if (methodRes.status !== 201) {
    throw new Error(`Failed to create payment method: ${methodRes.status}`);
  }
  const paymentMethodId = Number(methodRes.body.id);

  const locationRes = await request(app)
    .post('/api/v1/admin/stock-locations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Warehouse ${suffix}`,
      type: 'Warehouse',
      status: 'active',
    });
  if (locationRes.status !== 201) {
    throw new Error(`Failed to create stock location: ${locationRes.status}`);
  }
  const stockLocationId = Number(locationRes.body.id);

  const brandRes = await request(app)
    .post('/api/v1/admin/brands')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Brand ${suffix}`,
      slug: `brand-${suffix}`,
      description: 'PO flow brand',
      status: 'active',
    });
  if (brandRes.status !== 201) {
    throw new Error(`Failed to create brand: ${brandRes.status}`);
  }
  const brandId = Number(brandRes.body.id);

  const rootRes = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Category ${suffix}`,
      slug: `category-${suffix}`,
      status: 'active',
    });
  if (rootRes.status !== 201) {
    throw new Error(`Failed to create root category: ${rootRes.status}`);
  }
  const rootCategoryId = Number(rootRes.body.id);

  const subRes = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `SubCategory ${suffix}`,
      slug: `subcategory-${suffix}`,
      parentId: rootCategoryId,
      status: 'active',
    });
  if (subRes.status !== 201) {
    throw new Error(`Failed to create sub category: ${subRes.status}`);
  }
  const subCategoryId = Number(subRes.body.id);

  const gradeRes = await request(app)
    .post('/api/v1/admin/grades')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Grade ${suffix}`,
      slug: `grade-${suffix}`,
      status: 'active',
    });
  if (gradeRes.status !== 201) {
    throw new Error(`Failed to create grade: ${gradeRes.status}`);
  }
  const gradeId = Number(gradeRes.body.id);

  const productRes = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `PO Product ${suffix}`,
      shortDescription: 'Short description',
      longDescription: 'Long description',
      status: 'active',
      brandId,
      categoryId: rootCategoryId,
      subCategoryId,
      gradeId,
      images: ['image-1.jpg'],
      variants: [
        {
          sku: `SKU-${suffix}`,
          price: 99.99,
          name: 'Default',
          status: 'active',
        },
      ],
    });
  if (productRes.status !== 201) {
    throw new Error(`Failed to create product: ${productRes.status}`);
  }
  const productId = Number(productRes.body.id);

  const productDetailRes = await request(app)
    .get(`/api/v1/admin/products/${productId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const variants = productDetailRes.body?.variants ?? [];
  const variantId = Number(variants[0]?.id);
  if (!variantId) {
    throw new Error('Missing variant id');
  }

  return {
    accessToken,
    currencyId,
    vendorId,
    paymentMethodId,
    stockLocationId,
    brandId,
    rootCategoryId,
    subCategoryId,
    gradeId,
    productId,
    variantId,
    purchaseOrderIds: [],
    authCleanup,
  };
}

export async function cleanupPurchaseOrderFixtures(fix: PurchaseOrderFixtures) {
  if (fix.purchaseOrderIds.length) {
    await db
      .delete(goodsreceipts)
      .where(inArray(goodsreceipts.purchaseOrderId, fix.purchaseOrderIds));
  }
  if (fix.purchaseOrderIds.length) {
    await db
      .delete(purchaseorderlines)
      .where(inArray(purchaseorderlines.purchaseOrderId, fix.purchaseOrderIds));
    await db.delete(purchaseorders).where(inArray(purchaseorders.id, fix.purchaseOrderIds));
  }
  if (fix.variantId) {
    await db.delete(stockmovements).where(eq(stockmovements.productVariantId, fix.variantId));
    await db.delete(stocklevels).where(eq(stocklevels.productVariantId, fix.variantId));
  }
  if (fix.productId) {
    await db.delete(productvariants).where(eq(productvariants.productId, fix.productId));
    await db.delete(products).where(eq(products.id, fix.productId));
  }
  const categoryIds = [fix.subCategoryId, fix.rootCategoryId].filter(Boolean) as number[];
  if (categoryIds.length) {
    await db.delete(categories).where(inArray(categories.id, categoryIds));
  }
  await db.delete(brands).where(eq(brands.id, fix.brandId));
  await db.delete(grades).where(eq(grades.id, fix.gradeId));
  await db.delete(stocklocations).where(eq(stocklocations.id, fix.stockLocationId));
  await db.delete(paymentmethods).where(eq(paymentmethods.id, fix.paymentMethodId));
  await db.delete(vendors).where(eq(vendors.id, fix.vendorId));
  await db.delete(currencies).where(eq(currencies.id, fix.currencyId));
  await cleanupCatalogAuth(fix.authCleanup);
}

export async function createDraftPo(
  fix: PurchaseOrderFixtures,
  subject: string,
  overrides?: {
    discountType?: 'fixed' | 'percentage';
    discountValue?: number;
    shippingCost?: number;
    lines?: Array<{ productVariantId: number; orderedQty: number; unitCost: number; taxId?: number }>;
  }
) {
  const res = await request(app)
    .post('/api/v1/admin/purchase-orders')
    .set('Authorization', `Bearer ${fix.accessToken}`)
    .send({
      subject,
      vendorId: fix.vendorId,
      stockLocationId: fix.stockLocationId,
      currencyId: fix.currencyId,
      paymentTerms: 'Net 30',
      paymentMethodId: fix.paymentMethodId,
      discountType: overrides?.discountType,
      discountValue: overrides?.discountValue,
      shippingCost: overrides?.shippingCost,
      lines:
        overrides?.lines ?? [
          {
            productVariantId: fix.variantId,
            orderedQty: 2,
            unitCost: 10,
          },
        ],
    });

  if (res.status !== 201) {
    const safeBody =
      res.body && Object.keys(res.body).length > 0
        ? res.body
        : res.text ||
          (res.error && typeof res.error === 'object' && 'text' in res.error
            ? res.error.text
            : undefined);
    logger.error(
      {
        status: res.status,
        body: safeBody,
      },
      'createDraftPo failed'
    );
    throw new Error(`Failed to create PO: ${res.status}`);
  }
  const poId = Number(res.body.id);
  fix.purchaseOrderIds.push(poId);
  return res;
}

export async function submitAndApprovePurchaseOrder(accessToken: string, poId: number) {
  const submitRes = await request(app)
    .post(`/api/v1/admin/purchase-orders/${poId}/submit`)
    .set('Authorization', `Bearer ${accessToken}`);
  if (submitRes.status !== 200) {
    throw new Error(`Failed to submit PO: ${submitRes.status}`);
  }

  const approveRes = await request(app)
    .post(`/api/v1/admin/purchase-orders/${poId}/approve`)
    .set('Authorization', `Bearer ${accessToken}`);
  if (approveRes.status !== 200) {
    throw new Error(`Failed to approve PO: ${approveRes.status}`);
  }
  return approveRes;
}
