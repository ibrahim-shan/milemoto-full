import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  carts,
  cartitems,
  orderitems,
  ordertaxlines,
  orders,
  orderstatushistory,
  productimages,
  products,
  productvariants,
  stocklevels,
  stockmovements,
  users,
} from '@milemoto/types';
import type { CheckoutSubmitDto, CheckoutSubmitResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { quoteCheckout } from './quote.js';
import { calculateCheckoutTaxes } from './tax.js';

type LockedStockRow = {
  id: number;
  stockLocationId: number;
  onHand: number;
  allocated: number;
};

function rowsFromResult<T>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length === 0) return [];
    const first = result[0];
    if (Array.isArray(first)) return first as T[];
    return result as T[];
  }
  if (typeof result === 'object' && 'rows' in (result as object)) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

function generateOrderNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${y}${m}${day}-${h}${min}${s}-${rand}`;
}

export async function submitCheckoutCod(
  userId: number,
  input: CheckoutSubmitDto
): Promise<CheckoutSubmitResponse> {
  if (input.paymentMethodCode !== 'cod') {
    throw httpError(
      400,
      'UnsupportedPaymentMethod',
      'Only Cash on Delivery is available currently'
    );
  }

  const quote = await quoteCheckout(userId, input);
  if (!quote.canPlaceOrder) {
    throw httpError(
      400,
      'CheckoutValidationFailed',
      'Cart validation failed. Refresh checkout quote.'
    );
  }

  const billingAddress = input.billingAddress ?? input.shippingAddress;

  const result = await db.transaction(async (tx) => {
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (!cart) {
      throw httpError(400, 'CartEmpty', 'Cart is empty');
    }

    const cartRows = await tx
      .select({
        cartItemId: cartitems.id,
        productVariantId: cartitems.productVariantId,
        quantity: cartitems.quantity,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productStatus: products.status,
        variantName: productvariants.name,
        sku: productvariants.sku,
        price: productvariants.price,
        variantStatus: productvariants.status,
      })
      .from(cartitems)
      .innerJoin(productvariants, eq(cartitems.productVariantId, productvariants.id))
      .innerJoin(products, eq(productvariants.productId, products.id))
      .where(eq(cartitems.cartId, cart.id));

    if (cartRows.length === 0) {
      throw httpError(400, 'CartEmpty', 'Cart is empty');
    }

    const variantIds = [...new Set(cartRows.map((r) => Number(r.productVariantId)))];
    const productIds = [...new Set(cartRows.map((r) => Number(r.productId)))];

    const imageRows =
      productIds.length > 0
        ? await tx
            .select({ productId: productimages.productId, imagePath: productimages.imagePath })
            .from(productimages)
            .where(
              and(inArray(productimages.productId, productIds), eq(productimages.isPrimary, true))
            )
        : [];
    const imageMap = new Map<number, string>();
    for (const img of imageRows) {
      if (!imageMap.has(Number(img.productId))) imageMap.set(Number(img.productId), img.imagePath);
    }

    // Lock stock rows per variant and validate availability before mutating anything.
    const stockLocks = new Map<number, LockedStockRow[]>();
    for (const variantId of variantIds) {
      const lockResult = await tx.execute(
        sql`SELECT id, stockLocationId, onHand, allocated FROM stocklevels WHERE productVariantId = ${variantId} FOR UPDATE`
      );
      const lockedRows = rowsFromResult<LockedStockRow>(lockResult).map((r) => ({
        id: Number(r.id),
        stockLocationId: Number(r.stockLocationId),
        onHand: Number(r.onHand),
        allocated: Number(r.allocated),
      }));
      stockLocks.set(variantId, lockedRows);
    }

    const lineSnapshots = cartRows.map((row) => {
      const variantId = Number(row.productVariantId);
      const stockRows = stockLocks.get(variantId) ?? [];
      const available = stockRows.reduce((sum, s) => sum + (s.onHand - s.allocated), 0);

      if (row.productStatus !== 'active' || row.variantStatus !== 'active') {
        throw httpError(
          400,
          'CheckoutValidationFailed',
          `Item ${row.variantName} is no longer available`
        );
      }
      if (available <= 0 || row.quantity > available) {
        throw httpError(
          400,
          'CheckoutValidationFailed',
          `Insufficient stock for ${row.variantName}. Available: ${available}`
        );
      }

      const unitPrice = Number(row.price);
      return {
        cartItemId: Number(row.cartItemId),
        productId: Number(row.productId),
        productVariantId: variantId,
        productName: row.productName,
        productSlug: row.productSlug,
        variantName: row.variantName,
        sku: row.sku,
        imageSrc: imageMap.get(Number(row.productId)) ?? null,
        quantity: Number(row.quantity),
        unitPrice,
        lineTotal: unitPrice * Number(row.quantity),
      };
    });

    const subtotal = lineSnapshots.reduce((sum, l) => sum + l.lineTotal, 0);
    const discountTotal = 0;
    const shippingTotal = 0;
    const tax = await calculateCheckoutTaxes({
      subtotal,
      discountTotal,
      shippingTotal,
      ...(input.shippingAddress.countryId
        ? { shippingCountryId: input.shippingAddress.countryId }
        : {}),
      ...(billingAddress.countryId ? { billingCountryId: billingAddress.countryId } : {}),
    });
    const taxTotal = tax.taxTotal;
    const grandTotal = subtotal - discountTotal + shippingTotal + taxTotal;

    let orderId: number | null = null;
    let orderNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateOrderNumber();
      try {
        const inserted = await tx
          .insert(orders)
          .values({
            orderNumber: candidate,
            userId,
            status: 'pending_confirmation',
            paymentMethod: 'cod',
            paymentStatus: 'unpaid',
            paymentProvider: 'cod',
            paymentReference: null,
            currency: 'USD',
            subtotal,
            discountTotal,
            shippingTotal,
            taxTotal,
            grandTotal,
            shippingMethodCode: input.shippingMethodCode,
            couponCode: input.couponCode ?? null,
            notes: input.notes ?? null,
            shippingFullName: input.shippingAddress.fullName,
            shippingPhone: input.shippingAddress.phone,
            shippingEmail: input.shippingAddress.email ?? null,
            shippingCountry: input.shippingAddress.country,
            shippingState: input.shippingAddress.state,
            shippingCity: input.shippingAddress.city,
            shippingAddressLine1: input.shippingAddress.addressLine1,
            shippingAddressLine2: input.shippingAddress.addressLine2 ?? null,
            shippingPostalCode: input.shippingAddress.postalCode ?? null,
            billingFullName: billingAddress.fullName,
            billingPhone: billingAddress.phone,
            billingEmail: billingAddress.email ?? null,
            billingCountry: billingAddress.country,
            billingState: billingAddress.state,
            billingCity: billingAddress.city,
            billingAddressLine1: billingAddress.addressLine1,
            billingAddressLine2: billingAddress.addressLine2 ?? null,
            billingPostalCode: billingAddress.postalCode ?? null,
            placedAt: new Date(),
          })
          .$returningId();
        const id = inserted[0]?.id ? Number(inserted[0].id) : null;
        if (!id) throw httpError(500, 'InternalError', 'Failed to create order');
        orderId = id;
        orderNumber = candidate;
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          !message.toLowerCase().includes('uniqordernumber') &&
          !message.toLowerCase().includes('duplicate')
        ) {
          throw err;
        }
      }
    }

    if (!orderId) {
      throw httpError(500, 'InternalError', 'Failed to generate unique order number');
    }

    if (lineSnapshots.length > 0) {
      await tx.insert(orderitems).values(
        lineSnapshots.map((line) => ({
          orderId,
          productId: line.productId,
          productVariantId: line.productVariantId,
          sku: line.sku,
          productName: line.productName,
          variantName: line.variantName,
          imageSrc: line.imageSrc,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        }))
      );
    }

    if (tax.taxLines.length > 0) {
      await tx.insert(ordertaxlines).values(
        tax.taxLines.map((line) => ({
          orderId,
          taxId: line.taxId,
          taxName: line.name,
          taxType: line.type,
          taxRate: line.rate,
          countryId: line.countryId,
          amount: line.amount,
        }))
      );
    }

    await tx.insert(orderstatushistory).values({
      orderId,
      fromStatus: null,
      toStatus: 'pending_confirmation',
      reason: 'Order placed via checkout (COD)',
      actorUserId: userId,
    });

    // Deduct stock from available rows. Prefer rows with highest available first.
    for (const line of lineSnapshots) {
      let remaining = line.quantity;
      const rows = [...(stockLocks.get(line.productVariantId) ?? [])].sort(
        (a, b) => b.onHand - b.allocated - (a.onHand - a.allocated)
      );

      for (const level of rows) {
        if (remaining <= 0) break;
        const available = level.onHand - level.allocated;
        if (available <= 0) continue;

        const take = Math.min(remaining, available);
        const newOnHand = level.onHand - take;
        await tx.update(stocklevels).set({ onHand: newOnHand }).where(eq(stocklevels.id, level.id));
        await tx.insert(stockmovements).values({
          productVariantId: line.productVariantId,
          stockLocationId: level.stockLocationId,
          performedByUserId: userId,
          quantity: -take,
          type: 'sale_shipment',
          referenceType: 'customer_order',
          referenceId: orderId,
          note: `COD order ${orderNumber}`,
        });

        level.onHand = newOnHand;
        remaining -= take;
      }

      if (remaining > 0) {
        throw httpError(
          400,
          'CheckoutValidationFailed',
          `Insufficient stock while finalizing ${line.variantName}`
        );
      }
    }

    await tx.delete(cartitems).where(eq(cartitems.cartId, cart.id));
    await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
    if (input.saveAddressToAccount !== false) {
      await tx
        .update(users)
        .set({
          defaultShippingFullName: input.shippingAddress.fullName,
          defaultShippingPhone: input.shippingAddress.phone,
          defaultShippingEmail: input.shippingAddress.email ?? null,
          defaultShippingCountry: input.shippingAddress.country,
          defaultShippingCountryId: input.shippingAddress.countryId ?? null,
          defaultShippingState: input.shippingAddress.state,
          defaultShippingStateId: input.shippingAddress.stateId ?? null,
          defaultShippingCity: input.shippingAddress.city,
          defaultShippingCityId: input.shippingAddress.cityId ?? null,
          defaultShippingAddressLine1: input.shippingAddress.addressLine1,
          defaultShippingAddressLine2: input.shippingAddress.addressLine2 ?? null,
          defaultShippingPostalCode: input.shippingAddress.postalCode ?? null,
        })
        .where(eq(users.id, userId));
    }

    return { orderId, orderNumber };
  });

  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    status: 'pending_confirmation',
    paymentMethodCode: 'cod',
    paymentStatus: 'unpaid',
  };
}
