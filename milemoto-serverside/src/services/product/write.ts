import { and, eq, inArray, isNull } from 'drizzle-orm';
import {
  brands,
  goodsreceiptlines,
  productimages,
  products,
  productspecificationfields,
  productspecifications,
  productvariantattributes,
  productvariants,
  purchaseorderlines,
  stocklevels,
  stockmovements,
  variantvalues,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError, isForeignKeyConstraintError } from '../../utils/dbErrors.js';
import { syncAutomaticCollectionsForProduct } from '../collection.service.js';
import type { CreateProductDto, UpdateProductDto } from '@milemoto/types';
import { generateSlug, generateVariantSku } from './shared.js';
import { deleteImageFromStorage } from './storage.js';
import { getProduct } from './read.js';

export async function createProduct(data: CreateProductDto) {
  try {
    const { productId, slug } = await db.transaction(async (tx) => {
      // 1) Generate Slug with uniqueness check
      let nextSlug = generateSlug(data.name);
      let counter = 1;
      while (true) {
        const [existing] = await tx
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, nextSlug))
          .limit(1);
        if (!existing) break;
        nextSlug = `${generateSlug(data.name)}-${counter}`;
        counter++;
      }

      // 2) Insert base product
      const productInsert = await tx
        .insert(products)
        .values({
          name: data.name,
          shortDescription: data.shortDescription,
          longDescription: data.longDescription,
          slug: nextSlug,
          brandId: data.brandId ?? null,
          categoryId: data.categoryId ?? null,
          subCategoryId: data.subCategoryId ?? null,
          vendorId: data.vendorId ?? null,
          shippingMethodId: data.shippingMethodId ?? null,
          warrantyId: data.warrantyId ?? null,
          gradeId: data.gradeId ?? null,
          status: data.status ?? 'active',
        })
        .$returningId();

      const insertedProductId =
        productInsert[0]?.id !== undefined ? Number(productInsert[0].id) : null;
      if (!insertedProductId) {
        throw httpError(500, 'InsertFailed', 'Failed to create product');
      }

      // 3) Variants
      for (const variant of data.variants ?? []) {
        const variantInsert = await tx
          .insert(productvariants)
          .values({
            productId: insertedProductId,
            sku: variant.sku,
            barcode: variant.barcode ?? null,
            price: variant.price,
            costPrice: variant.costPrice ?? null,
            lowStockThreshold: variant.lowStockThreshold ?? 5,
            idealStockQuantity: variant.idealStockQuantity ?? null,
            name: variant.name,
            status: variant.status ?? 'active',
          })
          .$returningId();

        const variantId =
          variantInsert[0]?.id !== undefined ? Number(variantInsert[0].id) : undefined;
        if (!variantId) {
          throw httpError(500, 'InsertFailed', 'Failed to create product variant');
        }

        if (variant.attributes?.length) {
          await tx.insert(productvariantattributes).values(
            variant.attributes.map((a) => ({
              productVariantId: variantId,
              variantValueId: a.variantValueId,
            }))
          );
        }

        if (variant.imagePath) {
          await tx.insert(productimages).values({
            productId: insertedProductId,
            productVariantId: variantId,
            imagePath: variant.imagePath,
            isPrimary: false,
          });
        }
      }

      // 4) Base images
      if (data.images?.length) {
        await tx.insert(productimages).values(
          data.images.map((path, index) => ({
            productId: insertedProductId,
            imagePath: path,
            isPrimary: index === 0,
          }))
        );
      }

      // 5) Specifications
      for (const spec of data.specifications ?? []) {
        const specInsert = await tx
          .insert(productspecifications)
          .values({
            productId: insertedProductId,
            unitGroupId: spec.unitGroupId,
            unitValueId: spec.unitValueId,
          })
          .$returningId();

        const specId = specInsert[0]?.id !== undefined ? Number(specInsert[0].id) : undefined;
        if (!specId) {
          throw httpError(500, 'InsertFailed', 'Failed to create product specification');
        }

        if (spec.fields?.length) {
          await tx.insert(productspecificationfields).values(
            spec.fields.map((f) => ({
              productSpecificationId: specId,
              unitFieldId: f.unitFieldId,
              value: f.value ?? null,
            }))
          );
        }
      }

      return { productId: insertedProductId, slug: nextSlug };
    });

    await syncAutomaticCollectionsForProduct(productId);

    return {
      id: productId,
      slug,
      ...data,
    };
  } catch (error: unknown) {
    if (isForeignKeyConstraintError(error)) {
      throw httpError(400, 'BadRequest', 'Invalid reference ID (brand, category, vendor, etc.)');
    }

    if (isDuplicateEntryError(error)) {
      const message = (error as { message?: string }).message ?? '';
      if (message.includes('sku')) {
        throw httpError(409, 'Conflict', 'Product variant with this SKU already exists.');
      }
      if (message.includes('barcode')) {
        throw httpError(409, 'Conflict', 'Product variant with this Barcode already exists.');
      }
      if (message.includes('slug')) {
        throw httpError(409, 'Conflict', 'Product with this Name (slug) already exists.');
      }
    }

    throw error;
  }
}

export async function updateProduct(id: number, data: UpdateProductDto) {
  const filesToDelete: string[] = [];

  try {
    const ok = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: products.status, brandId: products.brandId })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (!current) return false;

      const currentStatus = current.status;
      const currentBrandId = current.brandId ?? null;
      const incomingBrandId = data.brandId !== undefined ? data.brandId : currentBrandId;
      const brandChanged = incomingBrandId !== currentBrandId;

      let brandCode = 'GEN';
      if (incomingBrandId) {
        const [br] = await tx
          .select({ name: brands.name })
          .from(brands)
          .where(eq(brands.id, incomingBrandId))
          .limit(1);
        if (br?.name) brandCode = br.name.substring(0, 3).toUpperCase();
      }

      const variantValueMap = new Map<number, string>();
      if (brandChanged && data.variants?.length) {
        const attrIds = new Set<number>();
        for (const variant of data.variants) {
          for (const attr of variant.attributes ?? []) {
            attrIds.add(attr.variantValueId);
          }
        }
        if (attrIds.size) {
          const rows = await tx
            .select({ id: variantvalues.id, value: variantvalues.value })
            .from(variantvalues)
            .where(inArray(variantvalues.id, [...attrIds]));
          for (const r of rows) variantValueMap.set(r.id, r.value);
        }
      }

      // 1) Update product fields
      const updates: Partial<typeof products.$inferInsert> = {};
      if (data.name !== undefined) {
        updates.name = data.name;
        updates.slug = generateSlug(data.name);
      }
      if (data.shortDescription !== undefined) updates.shortDescription = data.shortDescription;
      if (data.longDescription !== undefined) updates.longDescription = data.longDescription;
      if (data.brandId !== undefined) updates.brandId = data.brandId ?? null;
      if (data.categoryId !== undefined) updates.categoryId = data.categoryId ?? null;
      if (data.subCategoryId !== undefined) updates.subCategoryId = data.subCategoryId ?? null;
      if (data.vendorId !== undefined) updates.vendorId = data.vendorId ?? null;
      if (data.shippingMethodId !== undefined)
        updates.shippingMethodId = data.shippingMethodId ?? null;
      if (data.warrantyId !== undefined) updates.warrantyId = data.warrantyId ?? null;
      if (data.gradeId !== undefined) updates.gradeId = data.gradeId ?? null;
      if (data.status !== undefined) updates.status = data.status;

      if (Object.keys(updates).length) {
        await tx.update(products).set(updates).where(eq(products.id, id));

        if (data.status === 'inactive') {
          await tx
            .update(productvariants)
            .set({ status: 'inactive' })
            .where(eq(productvariants.productId, id));
        } else if (data.status === 'active' && currentStatus === 'inactive') {
          await tx
            .update(productvariants)
            .set({ status: 'active' })
            .where(eq(productvariants.productId, id));
        }
      }

      // 2) Variants sync
      if (data.variants) {
        const existingRows = await tx
          .select({ id: productvariants.id })
          .from(productvariants)
          .where(eq(productvariants.productId, id));
        const existingIds = existingRows.map((r) => r.id);
        const incomingIds = data.variants
          .map((v) => v.id)
          .filter((v): v is number => typeof v === 'number');

        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length) {
          await tx.delete(productvariants).where(inArray(productvariants.id, toDelete));
        }

        for (const variant of data.variants) {
          let nextSku = variant.sku;
          if (brandChanged) {
            const values = (variant.attributes ?? []).map(
              (a) => variantValueMap.get(a.variantValueId) ?? ''
            );
            nextSku = generateVariantSku(brandCode, values, variant.sku);
          }

          let nextStatus = variant.status ?? 'active';
          if (data.status === 'inactive') nextStatus = 'inactive';
          else if (data.status === 'active' && currentStatus === 'inactive') nextStatus = 'active';

          if (variant.id && existingIds.includes(variant.id)) {
            const variantId = variant.id;

            await tx
              .update(productvariants)
              .set({
                sku: nextSku,
                barcode: variant.barcode ?? null,
                price: variant.price,
                costPrice: variant.costPrice ?? null,
                lowStockThreshold: variant.lowStockThreshold ?? 5,
                idealStockQuantity: variant.idealStockQuantity ?? null,
                name: variant.name,
                status: nextStatus,
              })
              .where(eq(productvariants.id, variantId));

            await tx
              .delete(productvariantattributes)
              .where(eq(productvariantattributes.productVariantId, variantId));
            if (variant.attributes?.length) {
              await tx.insert(productvariantattributes).values(
                variant.attributes.map((a) => ({
                  productVariantId: variantId,
                  variantValueId: a.variantValueId,
                }))
              );
            }

            if (variant.imagePath !== undefined) {
              const [currentImg] = await tx
                .select({ imagePath: productimages.imagePath })
                .from(productimages)
                .where(eq(productimages.productVariantId, variantId))
                .limit(1);

              const currentImagePath = currentImg?.imagePath;
              const newImagePath = variant.imagePath;

              if (currentImagePath !== newImagePath) {
                if (currentImagePath) {
                  await tx
                    .delete(productimages)
                    .where(eq(productimages.productVariantId, variantId));
                  filesToDelete.push(currentImagePath);
                }
                if (newImagePath) {
                  await tx.insert(productimages).values({
                    productId: id,
                    productVariantId: variantId,
                    imagePath: newImagePath,
                    isPrimary: false,
                  });
                }
              }
            }
          } else {
            const inserted = await tx
              .insert(productvariants)
              .values({
                productId: id,
                sku: nextSku,
                barcode: variant.barcode ?? null,
                price: variant.price,
                costPrice: variant.costPrice ?? null,
                lowStockThreshold: variant.lowStockThreshold ?? 5,
                idealStockQuantity: variant.idealStockQuantity ?? null,
                name: variant.name,
                status: nextStatus,
              })
              .$returningId();

            const variantId = inserted[0]?.id !== undefined ? Number(inserted[0].id) : undefined;
            if (!variantId)
              throw httpError(500, 'InsertFailed', 'Failed to create product variant');

            if (variant.attributes?.length) {
              await tx.insert(productvariantattributes).values(
                variant.attributes.map((a) => ({
                  productVariantId: variantId,
                  variantValueId: a.variantValueId,
                }))
              );
            }

            if (variant.imagePath) {
              await tx.insert(productimages).values({
                productId: id,
                productVariantId: variantId,
                imagePath: variant.imagePath,
                isPrimary: false,
              });
            }
          }
        }
      }

      // 3) Specifications (replace)
      if (data.specifications) {
        await tx.delete(productspecifications).where(eq(productspecifications.productId, id));

        for (const spec of data.specifications) {
          const specInsert = await tx
            .insert(productspecifications)
            .values({
              productId: id,
              unitGroupId: spec.unitGroupId,
              unitValueId: spec.unitValueId,
            })
            .$returningId();

          const specId = specInsert[0]?.id !== undefined ? Number(specInsert[0].id) : undefined;
          if (!specId)
            throw httpError(500, 'InsertFailed', 'Failed to create product specification');

          if (spec.fields?.length) {
            await tx.insert(productspecificationfields).values(
              spec.fields.map((f) => ({
                productSpecificationId: specId,
                unitFieldId: f.unitFieldId,
                value: f.value ?? null,
              }))
            );
          }
        }
      }

      // 4) Base images (replace)
      if (data.images) {
        const existing = await tx
          .select({ imagePath: productimages.imagePath })
          .from(productimages)
          .where(and(eq(productimages.productId, id), isNull(productimages.productVariantId)));
        const oldUrls = existing.map((r) => r.imagePath);
        const removed = oldUrls.filter((url) => !data.images!.includes(url));
        filesToDelete.push(...removed);

        await tx
          .delete(productimages)
          .where(and(eq(productimages.productId, id), isNull(productimages.productVariantId)));

        if (data.images.length) {
          await tx.insert(productimages).values(
            data.images.map((path, index) => ({
              productId: id,
              imagePath: path,
              isPrimary: index === 0,
            }))
          );
        }
      }

      // 5) If product status changed to inactive, ensure variants are inactive (done above)
      // 6) Sync automatic collections if relevant (done after transaction)

      return true;
    });

    if (!ok) return null;

    await syncAutomaticCollectionsForProduct(id);

    if (filesToDelete.length > 0) {
      void Promise.allSettled(filesToDelete.map((url) => deleteImageFromStorage(url)));
    }

    return getProduct(id);
  } catch (error: unknown) {
    if (isDuplicateEntryError(error)) {
      const message = (error as { message?: string }).message ?? '';
      if (message.includes('sku')) {
        throw httpError(409, 'Conflict', 'Product variant with this SKU already exists.');
      }
      if (message.includes('barcode')) {
        throw httpError(409, 'Conflict', 'Product variant with this Barcode already exists.');
      }
      if (message.includes('slug')) {
        throw httpError(409, 'Conflict', 'Product with this Name (slug) already exists.');
      }
    }
    throw error;
  }
}

async function hasProductVariantReferences(productId: number) {
  const goodsReceiptRef = await db
    .select({ id: goodsreceiptlines.id })
    .from(goodsreceiptlines)
    .innerJoin(productvariants, eq(goodsreceiptlines.productVariantId, productvariants.id))
    .where(eq(productvariants.productId, productId))
    .limit(1);
  if (goodsReceiptRef.length > 0) return true;

  const purchaseOrderRef = await db
    .select({ id: purchaseorderlines.id })
    .from(purchaseorderlines)
    .innerJoin(productvariants, eq(purchaseorderlines.productVariantId, productvariants.id))
    .where(eq(productvariants.productId, productId))
    .limit(1);
  if (purchaseOrderRef.length > 0) return true;

  const stockLevelRef = await db
    .select({ id: stocklevels.id })
    .from(stocklevels)
    .innerJoin(productvariants, eq(stocklevels.productVariantId, productvariants.id))
    .where(eq(productvariants.productId, productId))
    .limit(1);
  if (stockLevelRef.length > 0) return true;

  const stockMovementRef = await db
    .select({ id: stockmovements.id })
    .from(stockmovements)
    .innerJoin(productvariants, eq(stockmovements.productVariantId, productvariants.id))
    .where(eq(productvariants.productId, productId))
    .limit(1);
  if (stockMovementRef.length > 0) return true;

  return false;
}

async function archiveProduct(id: number, message: string) {
  await db.transaction(async (tx) => {
    await tx.update(products).set({ status: 'inactive' }).where(eq(products.id, id));
    await tx
      .update(productvariants)
      .set({ status: 'inactive' })
      .where(eq(productvariants.productId, id));
  });

  await syncAutomaticCollectionsForProduct(id);

  return buildDeleteResponse(true, 'deactivated', message);
}

export async function deleteProduct(id: number) {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing) {
    return buildDeleteResponse(true, 'deleted', 'Product was already deleted.');
  }

  const hasReferences = await hasProductVariantReferences(id);
  if (hasReferences) {
    return archiveProduct(
      id,
      'Product has related records and was marked inactive instead of deleted.',
    );
  }

  try {
    const imageRows = await db
      .select({ imagePath: productimages.imagePath })
      .from(productimages)
      .where(eq(productimages.productId, id));
    const filesToDelete = imageRows.map((r) => r.imagePath);

    const result = await db.delete(products).where(eq(products.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    const success = affected > 0;

    if (success && filesToDelete.length > 0) {
      void Promise.allSettled(filesToDelete.map((url) => deleteImageFromStorage(url)));
    }

    if (!success) {
      const [stillExists] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (!stillExists) {
        return buildDeleteResponse(true, 'deleted', 'Product was already deleted.');
      }
    }

    return buildDeleteResponse(success, success ? 'deleted' : undefined);
  } catch (error: unknown) {
    if (isForeignKeyConstraintError(error)) {
      return archiveProduct(
        id,
        'Product has related records and was marked inactive instead of deleted.',
      );
    }
    throw error;
  }
}
