import { eq, sql } from 'drizzle-orm';
import { purchaseorderlines, purchaseorders } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import type { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '@milemoto/types';
import { getPurchaseOrder } from './read.js';
import { generatePoNumber } from './numbers.js';
import { assertActiveById } from './references.js';
import { computeHeaderTotals, computeLineAmounts, loadTaxRates } from './taxes.js';
import { updateOnOrderStock } from './stock.js';
import { parseDateOnly, validateDiscount } from './shared.js';

export async function createPurchaseOrder(data: CreatePurchaseOrderDto, userId: number) {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const poId = await db.transaction(async (tx) => {
        await Promise.all([
          assertActiveById(tx, 'vendors', data.vendorId, 'Vendor'),
          assertActiveById(tx, 'stockLocations', data.stockLocationId, 'Stock location'),
          assertActiveById(tx, 'currencies', data.currencyId, 'Currency'),
          assertActiveById(tx, 'paymentMethods', data.paymentMethodId, 'Payment method'),
        ]);
        if (data.inboundShippingMethodId !== undefined && data.inboundShippingMethodId !== null) {
          await assertActiveById(
            tx,
            'inboundShippingMethods',
            data.inboundShippingMethodId,
            'Inbound shipping method'
          );
        }

        validateDiscount(
          data.discountType,
          data.discountValue !== undefined ? Number(data.discountValue) : undefined
        );

        const poNumber = await generatePoNumber();

        const taxIds = data.lines.map((l) => l.taxId).filter((id): id is number => !!id);
        const taxMap = await loadTaxRates(tx, taxIds);

        let subtotal = 0;
        let taxTotal = 0;
        const lineInserts: Array<{
          productVariantId: number;
          description: string | null;
          orderedQty: number;
          unitCost: number;
          taxId: number | null;
          taxName: string | null;
          taxType: 'percentage' | 'fixed' | null;
          taxRate: number | null;
          expectedLineDeliveryDate: string | null;
          comments: string | null;
          lineSubtotal: number;
          lineTax: number;
          lineTotal: number;
        }> = [];

        for (const line of data.lines) {
          const orderedQty = line.orderedQty;
          const unitCostNum = Number(line.unitCost);
          const taxId = line.taxId ?? null;

          const lineArgs: { orderedQty: number; unitCost: number; taxId?: number } = {
            orderedQty,
            unitCost: unitCostNum,
          };
          if (taxId !== null) {
            lineArgs.taxId = taxId;
          }
          const taxMeta = taxId !== null ? (taxMap.get(taxId) ?? null) : null;

          const { lineSubtotal, lineTax, lineTotal } = computeLineAmounts(lineArgs, taxMap);

          subtotal += lineSubtotal;
          taxTotal += lineTax;

          lineInserts.push({
            productVariantId: line.productVariantId,
            description: line.description ?? null,
            orderedQty,
            unitCost: unitCostNum,
            taxId,
            taxName: taxMeta?.name ?? null,
            taxType: taxMeta?.type ?? null,
            taxRate: taxMeta?.rate ?? null,
            expectedLineDeliveryDate: line.expectedLineDeliveryDate ?? null,
            comments: line.comments ?? null,
            lineSubtotal,
            lineTax,
            lineTotal,
          });
        }

        const {
          subtotal: headerSubtotal,
          discountAmount,
          taxTotal: headerTaxTotal,
          total,
        } = computeHeaderTotals(
          { subtotal, taxTotal },
          data.discountType,
          data.discountValue !== undefined ? Number(data.discountValue) : undefined,
          data.shippingCost !== undefined ? Number(data.shippingCost) : undefined
        );

        const inserted = await tx
          .insert(purchaseorders)
          .values({
            poNumber,
            subject: data.subject,
            vendorId: data.vendorId,
            stockLocationId: data.stockLocationId,
            currencyId: data.currencyId,
            paymentTerms: data.paymentTerms,
            expectedDeliveryDate: parseDateOnly(data.expectedDeliveryDate),
            paymentMethodId: data.paymentMethodId,
            inboundShippingMethodId: data.inboundShippingMethodId ?? null,
            shippingCost: data.shippingCost ?? null,
            discountType: data.discountType ?? null,
            discountValue: data.discountValue ?? null,
            subtotal: headerSubtotal,
            discountAmount: discountAmount,
            taxTotal: headerTaxTotal,
            total: total,
            status: 'draft',
            supplierRef: data.supplierRef ?? null,
            internalNote: data.internalNote ?? null,
            createdByUserId: userId,
          })
          .$returningId();

        const createdId = Number(inserted[0]?.id);
        if (!createdId) {
          throw httpError(500, 'InsertFailed', 'Failed to create purchase order');
        }

        if (lineInserts.length > 0) {
          await tx.insert(purchaseorderlines).values(
            lineInserts.map((l) => ({
              purchaseOrderId: createdId,
              productVariantId: l.productVariantId,
              description: l.description,
              orderedQty: l.orderedQty,
              unitCost: l.unitCost,
              taxId: l.taxId,
              taxName: l.taxName,
              taxType: l.taxType,
              taxRate: l.taxRate,
              expectedLineDeliveryDate: parseDateOnly(l.expectedLineDeliveryDate),
              comments: l.comments,
              receivedQty: 0,
              rejectedQty: 0,
              cancelledQty: 0,
              lineSubtotal: l.lineSubtotal,
              lineTax: l.lineTax,
              lineTotal: l.lineTotal,
            }))
          );
        }

        return createdId;
      });

      return getPurchaseOrder(poId);
    } catch (err) {
      if (
        isDuplicateEntryError(err) &&
        String((err as { message?: string }).message ?? '').includes('uniqPoNumber')
      ) {
        if (attempt < maxAttempts - 1) {
          continue;
        }
      }
      if (isDuplicateEntryError(err)) {
        throw httpError(
          409,
          'DuplicatePurchaseOrder',
          'A purchase order with this number already exists'
        );
      }
      throw err;
    }
  }

  throw httpError(500, 'InsertFailed', 'Failed to create purchase order');
}

export async function updatePurchaseOrder(id: number, data: UpdatePurchaseOrderDto) {
  const poId = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(purchaseorders)
      .where(eq(purchaseorders.id, id))
      .limit(1);

    if (!current) {
      throw httpError(404, 'NotFound', 'Purchase order not found');
    }

    if (current.status !== 'draft' && current.status !== 'pending_approval') {
      throw httpError(
        400,
        'BadRequest',
        'Only draft or pending approval purchase orders can be updated'
      );
    }

    const updates: Partial<typeof purchaseorders.$inferInsert> = {};

    if (data.subject !== undefined) updates.subject = data.subject;
    if (data.vendorId !== undefined) updates.vendorId = data.vendorId;
    if (data.stockLocationId !== undefined) updates.stockLocationId = data.stockLocationId;
    if (data.currencyId !== undefined) updates.currencyId = data.currencyId;
    if (data.paymentTerms !== undefined) updates.paymentTerms = data.paymentTerms;
    if (data.expectedDeliveryDate !== undefined) {
      updates.expectedDeliveryDate = parseDateOnly(data.expectedDeliveryDate);
    }
    if (data.paymentMethodId !== undefined) updates.paymentMethodId = data.paymentMethodId;
    if (data.inboundShippingMethodId !== undefined) {
      updates.inboundShippingMethodId = data.inboundShippingMethodId ?? null;
    }
    if (data.shippingCost !== undefined) {
      updates.shippingCost = data.shippingCost ?? null;
    }
    if (data.supplierRef !== undefined) updates.supplierRef = data.supplierRef ?? null;
    if (data.internalNote !== undefined) updates.internalNote = data.internalNote ?? null;
    if (data.discountType !== undefined) updates.discountType = data.discountType ?? null;
    if (data.discountValue !== undefined) {
      updates.discountValue = data.discountValue ?? null;
    }

    let subtotal = Number(current.subtotal);
    let taxTotal = Number(current.taxTotal);

    const vendorIdToCheck = data.vendorId ?? current.vendorId;
    const stockLocationIdToCheck = data.stockLocationId ?? current.stockLocationId;
    const currencyIdToCheck = data.currencyId ?? current.currencyId;
    const paymentMethodIdToCheck = data.paymentMethodId ?? current.paymentMethodId;
    const inboundShippingMethodIdToCheck =
      data.inboundShippingMethodId !== undefined
        ? data.inboundShippingMethodId
        : current.inboundShippingMethodId;

    await Promise.all([
      assertActiveById(tx, 'vendors', vendorIdToCheck, 'Vendor'),
      assertActiveById(tx, 'stockLocations', stockLocationIdToCheck, 'Stock location'),
      assertActiveById(tx, 'currencies', currencyIdToCheck, 'Currency'),
      assertActiveById(tx, 'paymentMethods', paymentMethodIdToCheck, 'Payment method'),
    ]);
    if (inboundShippingMethodIdToCheck !== undefined && inboundShippingMethodIdToCheck !== null) {
      await assertActiveById(
        tx,
        'inboundShippingMethods',
        inboundShippingMethodIdToCheck,
        'Inbound shipping method'
      );
    }

    if (data.lines) {
      const taxIds = data.lines.map((l) => l.taxId).filter((id): id is number => !!id);
      const taxMap = await loadTaxRates(tx, taxIds);

      subtotal = 0;
      taxTotal = 0;

      const lineInserts: Array<{
        productVariantId: number;
        description: string | null;
        orderedQty: number;
        unitCost: number;
        taxId: number | null;
        taxName: string | null;
        taxType: 'percentage' | 'fixed' | null;
        taxRate: number | null;
        expectedLineDeliveryDate: string | null;
        comments: string | null;
        lineSubtotal: number;
        lineTax: number;
        lineTotal: number;
      }> = [];

      for (const line of data.lines) {
        const orderedQty = line.orderedQty;
        const unitCostNum = Number(line.unitCost);
        const taxId = line.taxId ?? null;

        const lineArgs: { orderedQty: number; unitCost: number; taxId?: number } = {
          orderedQty,
          unitCost: unitCostNum,
        };
        if (taxId !== null) {
          lineArgs.taxId = taxId;
        }
        const taxMeta = taxId !== null ? (taxMap.get(taxId) ?? null) : null;

        const { lineSubtotal, lineTax, lineTotal } = computeLineAmounts(lineArgs, taxMap);

        subtotal += lineSubtotal;
        taxTotal += lineTax;

        lineInserts.push({
          productVariantId: line.productVariantId,
          description: line.description ?? null,
          orderedQty,
          unitCost: unitCostNum,
          taxId,
          taxName: taxMeta?.name ?? null,
          taxType: taxMeta?.type ?? null,
          taxRate: taxMeta?.rate ?? null,
          expectedLineDeliveryDate: line.expectedLineDeliveryDate ?? null,
          comments: line.comments ?? null,
          lineSubtotal,
          lineTax,
          lineTotal,
        });
      }

      await tx.delete(purchaseorderlines).where(eq(purchaseorderlines.purchaseOrderId, id));

      if (lineInserts.length > 0) {
        await tx.insert(purchaseorderlines).values(
          lineInserts.map((l) => ({
            purchaseOrderId: id,
            productVariantId: l.productVariantId,
            description: l.description,
            orderedQty: l.orderedQty,
            unitCost: l.unitCost,
            taxId: l.taxId,
            taxName: l.taxName,
            taxType: l.taxType,
            taxRate: l.taxRate,
            expectedLineDeliveryDate: parseDateOnly(l.expectedLineDeliveryDate),
            comments: l.comments,
            receivedQty: 0,
            rejectedQty: 0,
            cancelledQty: 0,
            lineSubtotal: l.lineSubtotal,
            lineTax: l.lineTax,
            lineTotal: l.lineTotal,
          }))
        );
      }
    }

    if (
      data.lines ||
      data.discountType !== undefined ||
      data.discountValue !== undefined ||
      data.shippingCost !== undefined
    ) {
      const effectiveDiscountType =
        data.discountType ?? (current.discountType as 'fixed' | 'percentage' | null) ?? undefined;
      const effectiveDiscountValue =
        data.discountValue !== undefined
          ? Number(data.discountValue)
          : current.discountValue !== null
            ? Number(current.discountValue)
            : undefined;
      const effectiveShippingCost =
        data.shippingCost !== undefined
          ? Number(data.shippingCost)
          : current.shippingCost !== null
            ? Number(current.shippingCost)
            : undefined;

      validateDiscount(effectiveDiscountType, effectiveDiscountValue);

      const headerTotals = computeHeaderTotals(
        { subtotal, taxTotal },
        effectiveDiscountType,
        effectiveDiscountValue,
        effectiveShippingCost
      );

      updates.subtotal = headerTotals.subtotal;
      updates.discountAmount = headerTotals.discountAmount;
      updates.taxTotal = headerTotals.taxTotal;
      updates.total = headerTotals.total;
    }

    if (Object.keys(updates).length > 0) {
      await tx.update(purchaseorders).set(updates).where(eq(purchaseorders.id, id));
    }

    return id;
  });

  return getPurchaseOrder(poId);
}

async function getPurchaseOrderRowForStatusChange(id: number) {
  const [row] = await db.select().from(purchaseorders).where(eq(purchaseorders.id, id)).limit(1);
  if (!row) {
    throw httpError(404, 'NotFound', 'Purchase order not found');
  }
  return row;
}

export async function submitPurchaseOrder(id: number) {
  const row = await getPurchaseOrderRowForStatusChange(id);

  if (row.status !== 'draft') {
    throw httpError(400, 'BadRequest', 'Only draft purchase orders can be submitted for approval');
  }

  await db
    .update(purchaseorders)
    .set({ status: 'pending_approval' })
    .where(eq(purchaseorders.id, id));

  return getPurchaseOrder(id);
}

export async function approvePurchaseOrder(id: number, approverUserId: number) {
  const row = await getPurchaseOrderRowForStatusChange(id);

  if (row.status !== 'pending_approval') {
    throw httpError(400, 'BadRequest', 'Only pending approval purchase orders can be approved');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(purchaseorders)
      .set({
        status: 'approved',
        approvedByUserId: approverUserId,
        approvedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(purchaseorders.id, id));

    const lineRows = await tx
      .select({
        productVariantId: purchaseorderlines.productVariantId,
        orderedQty: purchaseorderlines.orderedQty,
      })
      .from(purchaseorderlines)
      .where(eq(purchaseorderlines.purchaseOrderId, id));

    const lines = lineRows.map((r) => ({
      productVariantId: Number(r.productVariantId),
      orderedQty: Number(r.orderedQty),
    }));

    await updateOnOrderStock(tx, Number(row.stockLocationId), lines, 'increase');
  });

  return getPurchaseOrder(id);
}

export async function cancelPurchaseOrder(id: number) {
  const row = await getPurchaseOrderRowForStatusChange(id);

  if (row.status !== 'draft' && row.status !== 'pending_approval' && row.status !== 'approved') {
    throw httpError(
      400,
      'BadRequest',
      'Only draft, pending approval, or approved purchase orders can be cancelled'
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(purchaseorders)
      .set({ status: 'cancelled', cancelledAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(purchaseorders.id, id));

    if (row.status === 'approved') {
      const lineRows = await tx
        .select({
          productVariantId: purchaseorderlines.productVariantId,
          orderedQty: purchaseorderlines.orderedQty,
        })
        .from(purchaseorderlines)
        .where(eq(purchaseorderlines.purchaseOrderId, id));

      const lines = lineRows.map((r) => ({
        productVariantId: Number(r.productVariantId),
        orderedQty: Number(r.orderedQty),
      }));

      await updateOnOrderStock(tx, Number(row.stockLocationId), lines, 'decrease');
    }
  });

  return getPurchaseOrder(id);
}

export async function rejectPurchaseOrder(id: number, userId: number) {
  const row = await getPurchaseOrderRowForStatusChange(id);

  if (row.status !== 'pending_approval') {
    throw httpError(400, 'BadRequest', 'Only pending approval purchase orders can be rejected');
  }

  await db
    .update(purchaseorders)
    .set({ status: 'cancelled', approvedByUserId: userId, approvedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(purchaseorders.id, id));

  return getPurchaseOrder(id);
}

export async function closePurchaseOrder(id: number) {
  const row = await getPurchaseOrderRowForStatusChange(id);

  if (row.status !== 'approved' && row.status !== 'partially_received') {
    throw httpError(
      400,
      'BadRequest',
      'Only approved or partially received purchase orders can be manually closed'
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(purchaseorders)
      .set({ status: 'closed', updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(purchaseorders.id, id));

    const lineRows = await tx
      .select({
        id: purchaseorderlines.id,
        productVariantId: purchaseorderlines.productVariantId,
        orderedQty: purchaseorderlines.orderedQty,
        receivedQty: purchaseorderlines.receivedQty,
        rejectedQty: purchaseorderlines.rejectedQty,
        cancelledQty: purchaseorderlines.cancelledQty,
      })
      .from(purchaseorderlines)
      .where(eq(purchaseorderlines.purchaseOrderId, id));

    const stockUpdates: Array<{ productVariantId: number; orderedQty: number }> = [];
    const lineUpdates: Array<{ id: number; additionalCancelledQty: number }> = [];

    for (const l of lineRows) {
      const ordered = Number(l.orderedQty);
      const received = Number(l.receivedQty);
      const rejected = Number(l.rejectedQty);
      const cancelled = Number(l.cancelledQty);

      const remaining = ordered - (received + rejected + cancelled);

      if (remaining > 0) {
        stockUpdates.push({
          productVariantId: Number(l.productVariantId),
          orderedQty: remaining,
        });
        lineUpdates.push({
          id: Number(l.id),
          additionalCancelledQty: remaining,
        });
      }
    }

    if (stockUpdates.length > 0) {
      await updateOnOrderStock(tx, Number(row.stockLocationId), stockUpdates, 'decrease');

      for (const update of lineUpdates) {
        await tx
          .update(purchaseorderlines)
          .set({
            cancelledQty: sql<number>`${purchaseorderlines.cancelledQty} + ${update.additionalCancelledQty}`,
          })
          .where(eq(purchaseorderlines.id, update.id));
      }
    }
  });

  return getPurchaseOrder(id);
}
