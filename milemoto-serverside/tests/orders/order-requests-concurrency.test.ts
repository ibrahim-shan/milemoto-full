import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import {
  orderitems,
  orders,
  orderrequests,
  orderstatushistory,
  productvariants,
  products,
  stocklevels,
  stocklocations,
  stockmovements,
  users,
} from '@milemoto/types';
import { db } from '../../src/db/drizzle.js';
import {
  completeAdminOrderRequest,
  createCustomerOrderRequest,
  decideAdminOrderRequest,
} from '../../src/services/orders/requests.js';

type Fixture = {
  customerId: number;
  adminId: number;
  productId: number;
  variantId: number;
  stockLocationId: number;
  orderId: number;
  requestId?: number;
};

const createdFixtures: Fixture[] = [];

function uniqueToken(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function seedFixture(input: {
  orderStatus: (typeof orders.$inferSelect)['status'];
  paymentStatus?: (typeof orders.$inferSelect)['paymentStatus'];
  orderQty?: number;
  request?: {
    type: (typeof orderrequests.$inferSelect)['type'];
    status: (typeof orderrequests.$inferSelect)['status'];
    reason?: string;
  };
}): Promise<Fixture> {
  const token = uniqueToken('orq');
  const [customerRes] = await db
    .insert(users)
    .values({
      fullName: `Customer ${token}`,
      email: `customer.${token}@milemoto.local`,
      passwordHash: 'test-hash',
      role: 'user',
      status: 'active',
    })
    .$returningId();
  const [adminRes] = await db
    .insert(users)
    .values({
      fullName: `Admin ${token}`,
      email: `admin.${token}@milemoto.local`,
      passwordHash: 'test-hash',
      role: 'admin',
      status: 'active',
    })
    .$returningId();

  const customerId = Number(customerRes?.id);
  const adminId = Number(adminRes?.id);

  const [productRes] = await db
    .insert(products)
    .values({
      name: `Order Req Product ${token}`,
      slug: `order-req-product-${token}`,
      shortDescription: 's',
      longDescription: 'l',
      status: 'active',
      isFeatured: false,
    })
    .$returningId();
  const productId = Number(productRes?.id);

  const [variantRes] = await db
    .insert(productvariants)
    .values({
      productId,
      sku: `ORQ-SKU-${token}`,
      price: 10,
      name: 'Default',
      status: 'active',
    })
    .$returningId();
  const variantId = Number(variantRes?.id);

  const [locationRes] = await db
    .insert(stocklocations)
    .values({
      name: `ORQ-Loc-${token}`,
      type: 'Warehouse',
      status: 'active',
    })
    .$returningId();
  const stockLocationId = Number(locationRes?.id);

  const [orderRes] = await db
    .insert(orders)
    .values({
      orderNumber: `ORD-${token}`,
      userId: customerId,
      status: input.orderStatus,
      paymentMethod: 'cod',
      paymentStatus: input.paymentStatus ?? 'paid',
      currency: 'USD',
      subtotal: 20,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      grandTotal: 20,
      shippingFullName: 'Test Customer',
      shippingPhone: '0000',
      shippingCountry: 'LB',
      shippingState: 'Beirut',
      shippingCity: 'Beirut',
      shippingAddressLine1: 'Street 1',
      billingFullName: 'Test Customer',
      billingPhone: '0000',
      billingCountry: 'LB',
      billingState: 'Beirut',
      billingCity: 'Beirut',
      billingAddressLine1: 'Street 1',
      placedAt: new Date(),
    })
    .$returningId();
  const orderId = Number(orderRes?.id);

  const orderQty = input.orderQty ?? 2;
  await db.insert(orderitems).values({
    orderId,
    productId,
    productVariantId: variantId,
    sku: `ORQ-SKU-${token}`,
    productName: 'Order Req Product',
    variantName: 'Default',
    imageSrc: null,
    unitPrice: 10,
    quantity: orderQty,
    lineTotal: 20,
  });

  if (input.orderStatus === 'delivered') {
    await db.insert(orderstatushistory).values({
      orderId,
      fromStatus: 'shipped',
      toStatus: 'delivered',
      reason: 'test',
      actorUserId: adminId,
    });
  }

  let requestId: number | undefined;
  if (input.request) {
    const [requestRes] = await db
      .insert(orderrequests)
      .values({
        orderId,
        userId: customerId,
        type: input.request.type,
        status: input.request.status,
        reason: input.request.reason ?? 'test',
      })
      .$returningId();
    requestId = Number(requestRes?.id);
  }

  const fixture: Fixture = {
    customerId,
    adminId,
    productId,
    variantId,
    stockLocationId,
    orderId,
    ...(requestId ? { requestId } : {}),
  };
  createdFixtures.push(fixture);
  return fixture;
}

async function cleanupFixture(fx: Fixture) {
  await db
    .delete(stockmovements)
    .where(
      or(
        eq(stockmovements.productVariantId, fx.variantId),
        and(eq(stockmovements.referenceType, 'order_request_return'), eq(stockmovements.referenceId, fx.requestId ?? -1))
      )
    );
  await db.delete(stocklevels).where(eq(stocklevels.productVariantId, fx.variantId));
  await db.delete(orderrequests).where(eq(orderrequests.orderId, fx.orderId));
  await db.delete(orderitems).where(eq(orderitems.orderId, fx.orderId));
  await db.delete(orderstatushistory).where(eq(orderstatushistory.orderId, fx.orderId));
  await db.delete(orders).where(eq(orders.id, fx.orderId));
  await db.delete(productvariants).where(eq(productvariants.id, fx.variantId));
  await db.delete(products).where(eq(products.id, fx.productId));
  await db.delete(stocklocations).where(eq(stocklocations.id, fx.stockLocationId));
  await db.delete(users).where(inArray(users.id, [fx.customerId, fx.adminId]));
}

describe.sequential('order requests concurrency safety', () => {
  afterEach(async () => {
    while (createdFixtures.length > 0) {
      const fx = createdFixtures.pop();
      if (fx) await cleanupFixture(fx);
    }
  });

  it('allows only one active request for same order/type under concurrent create', async () => {
    const fx = await seedFixture({ orderStatus: 'confirmed', paymentStatus: 'unpaid' });

    const [r1, r2] = await Promise.allSettled([
      createCustomerOrderRequest(fx.customerId, fx.orderId, {
        type: 'cancel',
        reason: 'Please cancel',
      }),
      createCustomerOrderRequest(fx.customerId, fx.orderId, {
        type: 'cancel',
        reason: 'Please cancel',
      }),
    ]);

    const fulfilled = [r1, r2].filter(r => r.status === 'fulfilled');
    const rejected = [r1, r2].filter(r => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderrequests)
      .where(
        and(
          eq(orderrequests.orderId, fx.orderId),
          eq(orderrequests.userId, fx.customerId),
          eq(orderrequests.type, 'cancel'),
          eq(orderrequests.status, 'pending')
        )
      );
    expect(Number(countRow?.count ?? 0)).toBe(1);
  });

  it('prevents conflicting concurrent decide actions on same pending request', async () => {
    const fx = await seedFixture({
      orderStatus: 'delivered',
      request: { type: 'refund', status: 'pending', reason: 'refund test' },
    });
    if (!fx.requestId) throw new Error('Missing request id');

    const [r1, r2] = await Promise.allSettled([
      decideAdminOrderRequest(fx.requestId, fx.adminId, { status: 'approved' }),
      decideAdminOrderRequest(fx.requestId, fx.adminId, {
        status: 'rejected',
        adminNote: 'reject in race',
      }),
    ]);

    const fulfilled = [r1, r2].filter(r => r.status === 'fulfilled');
    const rejected = [r1, r2].filter(r => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const [row] = await db
      .select({ status: orderrequests.status })
      .from(orderrequests)
      .where(eq(orderrequests.id, fx.requestId))
      .limit(1);
    expect(['approved', 'rejected']).toContain(String(row?.status));
  });

  it('applies return completion side effects only once under concurrent complete calls', async () => {
    const fx = await seedFixture({
      orderStatus: 'delivered',
      orderQty: 2,
      request: { type: 'return', status: 'approved', reason: 'return test' },
    });
    if (!fx.requestId) throw new Error('Missing request id');

    const [c1, c2] = await Promise.allSettled([
      completeAdminOrderRequest(fx.requestId, fx.adminId, {
        adminNote: 'complete 1',
        returnStockLocationId: fx.stockLocationId,
      }),
      completeAdminOrderRequest(fx.requestId, fx.adminId, {
        adminNote: 'complete 2',
        returnStockLocationId: fx.stockLocationId,
      }),
    ]);

    const fulfilled = [c1, c2].filter(r => r.status === 'fulfilled');
    const rejected = [c1, c2].filter(r => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const [level] = await db
      .select({ onHand: stocklevels.onHand })
      .from(stocklevels)
      .where(
        and(
          eq(stocklevels.productVariantId, fx.variantId),
          eq(stocklevels.stockLocationId, fx.stockLocationId)
        )
      )
      .limit(1);
    expect(Number(level?.onHand ?? 0)).toBe(2);

    const [movementCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(stockmovements)
      .where(
        and(
          eq(stockmovements.referenceType, 'order_request_return'),
          eq(stockmovements.referenceId, fx.requestId)
        )
      );
    expect(Number(movementCount?.count ?? 0)).toBe(1);
  });
});
