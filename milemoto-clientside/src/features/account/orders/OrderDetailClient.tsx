'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { formatOrderStatus, OrderStatusBadge } from './order-status';

import { OrderTaxLinesBreakdown } from '@/features/orders/OrderTaxLinesBreakdown';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyOrderById } from '@/lib/checkout';
import type { CustomerOrderDetailResponse } from '@/types';
import { Button } from '@/ui/button';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function cleanOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return null;
  return trimmed;
}

export function OrderDetailClient({ orderId }: { orderId: number }) {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<CustomerOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/signin?next=/account/orders/${orderId}`);
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting request UI state before starting fetch
    setLoading(true);
    setError(null);

    fetchMyOrderById(orderId)
      .then(data => {
        if (!cancelled) setOrder(data);
      })
      .catch(err => {
        if (!cancelled) setError((err as { message?: string })?.message || 'Failed to load order');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, orderId, router]);

  if (authLoading || !isAuthenticated || loading) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">Loading order...</p>
      </article>
    );
  }

  if (error || !order) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold tracking-tight">Order Details</h2>
        <p className="mt-2 text-sm text-red-600">{error || 'Order not found'}</p>
        <div className="mt-4 flex gap-2">
          <Button
            href="/account/orders"
            variant="outline"
            size="sm"
          >
            Back to Orders
          </Button>
        </div>
      </article>
    );
  }

  const shippingEmail = cleanOptionalText(order.shippingAddress.email);
  const shippingAddressLine2 = cleanOptionalText(order.shippingAddress.addressLine2);
  const shippingPostalCode = cleanOptionalText(order.shippingAddress.postalCode);
  const billingEmail = cleanOptionalText(order.billingAddress.email);
  const billingAddressLine2 = cleanOptionalText(order.billingAddress.addressLine2);
  const billingPostalCode = cleanOptionalText(order.billingAddress.postalCode);

  return (
    <article className="space-y-6">
      <div className="border-border/60 bg-card rounded-xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Order {order.orderNumber}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Placed on {formatDate(order.placedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <OrderStatusBadge status={order.status} />
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="uppercase tracking-wide">{order.paymentMethod}</span>
              <OrderStatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            href="/account/orders"
            variant="outline"
            size="sm"
          >
            Back to Orders
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="border-border/60 bg-card rounded-xl border p-6">
          <h3 className="text-base font-semibold">Items</h3>
          <div className="mt-4 space-y-4">
            {order.items.map(item => (
              <div
                key={item.id}
                className="border-border/60 flex items-start justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  {item.variantName ? (
                    <p className="text-muted-foreground text-sm">{item.variantName}</p>
                  ) : null}
                  {item.sku ? (
                    <p className="text-muted-foreground text-xs">SKU: {item.sku}</p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">Qty: {item.quantity}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{formatMoney(item.unitPrice, order.currency)} each</p>
                  <p className="font-semibold">{formatMoney(item.lineTotal, order.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="border-border/60 bg-card rounded-xl border p-6">
            <h3 className="text-base font-semibold">Order Summary</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatMoney(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>{formatMoney(order.discountTotal, order.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{formatMoney(order.shippingTotal, order.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatMoney(order.taxTotal, order.currency)}</dd>
              </div>
              <div className="border-border/60 mt-2 flex items-center justify-between border-t pt-3 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
              </div>
            </dl>
            {order.taxTotal > 0 && order.taxLines.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-xs">
                This order has a tax total but no stored tax line snapshot.
              </p>
            ) : null}
          </section>

          <OrderTaxLinesBreakdown
            taxLines={order.taxLines}
            currency={order.currency}
          />

          <section className="border-border/60 bg-card rounded-xl border p-6">
            <h3 className="text-base font-semibold">Shipping Address</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.phone}</p>
              {shippingEmail ? <p>{shippingEmail}</p> : null}
              <p>{order.shippingAddress.addressLine1}</p>
              {shippingAddressLine2 ? <p>{shippingAddressLine2}</p> : null}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </p>
              <p>{order.shippingAddress.country}</p>
              {shippingPostalCode ? <p>{shippingPostalCode}</p> : null}
            </div>
          </section>

          <section className="border-border/60 bg-card rounded-xl border p-6">
            <h3 className="text-base font-semibold">Billing Address</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{order.billingAddress.fullName}</p>
              <p>{order.billingAddress.phone}</p>
              {billingEmail ? <p>{billingEmail}</p> : null}
              <p>{order.billingAddress.addressLine1}</p>
              {billingAddressLine2 ? <p>{billingAddressLine2}</p> : null}
              <p>
                {order.billingAddress.city}, {order.billingAddress.state}
              </p>
              <p>{order.billingAddress.country}</p>
              {billingPostalCode ? <p>{billingPostalCode}</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <section className="border-border/60 bg-card rounded-xl border p-6">
        <h3 className="text-base font-semibold">Status History</h3>
        <div className="mt-4 space-y-3">
          {order.statusHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No status updates yet.</p>
          ) : (
            order.statusHistory.map(entry => (
              <div
                key={entry.id}
                className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{formatOrderStatus(entry.toStatus)}</p>
                  {entry.reason ? (
                    <p className="text-muted-foreground text-sm">{entry.reason}</p>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-sm">{formatDate(entry.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
}

export default OrderDetailClient;
