import type { CheckoutQuoteDto, CheckoutQuoteResponse } from '@milemoto/types';
import { validateCart } from '../cart.service.js';
import { httpError } from '../../utils/error.js';
import { calculateCheckoutTaxes } from './tax.js';

export async function quoteCheckout(
  userId: number,
  input: CheckoutQuoteDto
): Promise<CheckoutQuoteResponse> {
  const paymentMethodCode = (input.paymentMethodCode || 'cod').toLowerCase();
  if (paymentMethodCode !== 'cod') {
    throw httpError(
      400,
      'UnsupportedPaymentMethod',
      'Only Cash on Delivery is available currently'
    );
  }

  const cart = await validateCart(userId);

  const items = cart.items.map((item) => ({
    cartItemId: item.id,
    productId: item.productId,
    productVariantId: item.productVariantId,
    productName: item.productName,
    productSlug: item.productSlug,
    variantName: item.variantName,
    sku: item.sku,
    imageSrc: item.imageSrc,
    quantity: item.quantity,
    available: item.available,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
    ...(item.warning ? { warning: item.warning } : {}),
  }));

  const errors: string[] = [];
  if (items.length === 0) {
    errors.push('CART_EMPTY');
  }

  const hasBlockingWarning = items.some(
    (i) =>
      (i.warning ?? '').includes('no longer available') ||
      (i.warning ?? '').includes('out of stock') ||
      (i.warning ?? '').includes('Only ')
  );
  if (hasBlockingWarning) {
    errors.push('CART_INVALID');
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountTotal = 0;
  const shippingTotal = 0;
  const tax = await calculateCheckoutTaxes({
    subtotal,
    discountTotal,
    shippingTotal,
    ...(input.shippingAddress?.countryId
      ? { shippingCountryId: input.shippingAddress.countryId }
      : {}),
    ...(input.billingAddress?.countryId
      ? { billingCountryId: input.billingAddress.countryId }
      : {}),
  });
  const taxTotal = tax.taxTotal;
  const grandTotal = subtotal - discountTotal + shippingTotal + taxTotal;

  return {
    cartId: cart.id,
    paymentMethodCode,
    shippingMethodCode: input.shippingMethodCode ?? null,
    items,
    warnings: cart.warnings,
    errors,
    taxLines: tax.taxLines,
    totals: {
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      grandTotal,
    },
    canPlaceOrder: errors.length === 0,
  };
}
