import { eq } from 'drizzle-orm';
import {
  currencies,
  inboundshippingmethods,
  paymentmethods,
  stocklocations,
  vendors,
} from '@milemoto/types';
import { httpError } from '../../utils/error.js';
import type { DbClient } from './shared.js';

export async function assertActiveById(
  client: DbClient,
  table: 'vendors' | 'stockLocations' | 'currencies' | 'paymentMethods' | 'inboundShippingMethods',
  id: number,
  label: string
) {
  const row =
    table === 'vendors'
      ? await client
          .select({ status: vendors.status })
          .from(vendors)
          .where(eq(vendors.id, id))
          .limit(1)
          .then((r) => r[0])
      : table === 'stockLocations'
        ? await client
            .select({ status: stocklocations.status })
            .from(stocklocations)
            .where(eq(stocklocations.id, id))
            .limit(1)
            .then((r) => r[0])
        : table === 'currencies'
          ? await client
              .select({ status: currencies.status })
              .from(currencies)
              .where(eq(currencies.id, id))
              .limit(1)
              .then((r) => r[0])
          : table === 'paymentMethods'
            ? await client
                .select({ status: paymentmethods.status })
                .from(paymentmethods)
                .where(eq(paymentmethods.id, id))
                .limit(1)
                .then((r) => r[0])
            : await client
                .select({ status: inboundshippingmethods.status })
                .from(inboundshippingmethods)
                .where(eq(inboundshippingmethods.id, id))
                .limit(1)
                .then((r) => r[0]);

  if (!row) {
    throw httpError(400, 'BadRequest', `${label} not found`);
  }
  if (row.status !== 'active') {
    throw httpError(400, 'BadRequest', `${label} is not active`);
  }
}
