'use client';

import { useEffect, useState } from 'react';

import { AdminOrderStatusBadge, formatAdminOrderStatus } from './order-status';
import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { OrderTaxLinesBreakdown } from '@/features/orders/OrderTaxLinesBreakdown';
import {
  cancelAdminOrder,
  confirmAdminOrder,
  deliverAdminOrder,
  fetchAdminOrderById,
  processAdminOrder,
  shipAdminOrder,
} from '@/lib/admin-orders';
import type { AdminOrderDetailResponse } from '@/types';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { OrderTracking } from '@/ui/order-tracking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatDateTime(value: string) {
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

export function AdminOrderDetailClient({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<AdminOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminOrderById(orderId)
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
  }, [orderId]);

  const handleTransition = async (
    action: 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel',
  ) => {
    if (!order) return;
    try {
      setTransitionLoading(action);
      const updated =
        action === 'confirm'
          ? await confirmAdminOrder(order.id)
          : action === 'process'
            ? await processAdminOrder(order.id)
            : action === 'ship'
              ? await shipAdminOrder(order.id)
              : action === 'deliver'
                ? await deliverAdminOrder(order.id)
                : await cancelAdminOrder(order.id);
      setOrder(updated);
      toast.success('Order status updated');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update order status');
    } finally {
      setTransitionLoading(null);
    }
  };

  return (
    <PermissionGuard requiredPermission="orders.read">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            href="/admin/orders"
            variant="outline"
            size="sm"
          >
            Back to Orders
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading order...</p>
            ) : error || !order ? (
              <p className="text-sm text-red-600">{error || 'Order not found'}</p>
            ) : (
              <AdminOrderDetailContent
                order={order}
                transitionLoading={transitionLoading}
                onTransition={handleTransition}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}

function getAllowedActions(
  status: string,
): Array<'confirm' | 'process' | 'ship' | 'deliver' | 'cancel'> {
  switch (status) {
    case 'pending_confirmation':
      return ['confirm', 'cancel'];
    case 'confirmed':
      return ['process', 'cancel'];
    case 'processing':
      return ['ship', 'cancel'];
    case 'shipped':
      return ['deliver'];
    default:
      return [];
  }
}

function actionLabel(action: 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel') {
  switch (action) {
    case 'confirm':
      return 'Confirm Order';
    case 'process':
      return 'Mark Processing';
    case 'ship':
      return 'Mark Shipped';
    case 'deliver':
      return 'Mark Delivered';
    case 'cancel':
      return 'Cancel Order';
  }
}

function AdminOrderDetailContent({
  order,
  transitionLoading,
  onTransition,
}: {
  order: AdminOrderDetailResponse;
  transitionLoading: string | null;
  onTransition: (action: 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel') => void;
}) {
  const shippingEmail = cleanOptionalText(order.shippingAddress.email);
  const shippingLine2 = cleanOptionalText(order.shippingAddress.addressLine2);
  const shippingPostal = cleanOptionalText(order.shippingAddress.postalCode);
  const billingEmail = cleanOptionalText(order.billingAddress.email);
  const billingLine2 = cleanOptionalText(order.billingAddress.addressLine2);
  const billingPostal = cleanOptionalText(order.billingAddress.postalCode);
  const allowedActions = getAllowedActions(order.status);
  const primaryAction = allowedActions.find(action => action !== 'cancel') ?? null;
  const canCancel = allowedActions.includes('cancel');

  return (
    <div className="space-y-6">
      {allowedActions.length > 0 ? (
        <div className="bg-muted/20 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Order Actions</div>
              <div className="text-sm font-medium">Manage next workflow step</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {primaryAction ? (
                <Button
                  size="sm"
                  onClick={() => onTransition(primaryAction)}
                  disabled={transitionLoading !== null}
                >
                  {transitionLoading === primaryAction ? 'Updating...' : actionLabel(primaryAction)}
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onTransition('cancel')}
                  disabled={transitionLoading !== null}
                >
                  {transitionLoading === 'cancel' ? 'Cancelling...' : actionLabel('cancel')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Info
          label="Order Number"
          value={order.orderNumber}
          mono
        />
        <Info
          label="Customer User"
          value={`#${order.userId}`}
        />
        <Info
          label="Placed At"
          value={formatDateTime(order.placedAt)}
        />
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs uppercase">Order Status</div>
          <AdminOrderStatusBadge status={order.status} />
        </div>
        <Info
          label="Payment Method"
          value={order.paymentMethod.toUpperCase()}
        />
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs uppercase">Payment Status</div>
          <AdminOrderStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="text-muted-foreground text-xs font-semibold uppercase">Items</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground text-center"
                    >
                      No line items.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{item.productName}</div>
                          {item.variantName ? (
                            <div className="text-muted-foreground text-xs">{item.variantName}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMoney(item.unitPrice, order.currency)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(item.lineTotal, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-3">
            <div className="text-muted-foreground text-xs font-semibold uppercase">
              Status History
            </div>
            <div className="rounded-md border p-3">
              <OrderTracking
                entries={order.statusHistory}
                currentStatus={order.status}
                formatStatus={formatAdminOrderStatus}
                formatDate={formatDateTime}
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border p-4">
            <div className="text-muted-foreground text-xs font-semibold uppercase">Totals</div>
            <dl className="mt-3 space-y-2 text-sm">
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
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
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
            title="Tax Snapshot Lines"
          />

          <AddressCard
            title="Shipping Address"
            address={order.shippingAddress}
            email={shippingEmail}
            line2={shippingLine2}
            postal={shippingPostal}
          />

          <AddressCard
            title="Billing Address"
            address={order.billingAddress}
            email={billingEmail}
            line2={billingLine2}
            postal={billingPostal}
          />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs uppercase">{label}</div>
      <div className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</div>
    </div>
  );
}

function AddressCard({
  title,
  address,
  email,
  line2,
  postal,
}: {
  title: string;
  address: AdminOrderDetailResponse['shippingAddress'];
  email: string | null;
  line2: string | null;
  postal: string | null;
}) {
  return (
    <section className="rounded-md border p-4">
      <div className="text-muted-foreground text-xs font-semibold uppercase">{title}</div>
      <div className="mt-3 space-y-1 text-sm">
        <p className="font-medium">{address.fullName}</p>
        <p>{address.phone}</p>
        {email ? <p>{email}</p> : null}
        <p>{address.addressLine1}</p>
        {line2 ? <p>{line2}</p> : null}
        <p>
          {address.city}, {address.state}
        </p>
        <p>{address.country}</p>
        {postal ? <p>{postal}</p> : null}
      </div>
    </section>
  );
}

export default AdminOrderDetailClient;
