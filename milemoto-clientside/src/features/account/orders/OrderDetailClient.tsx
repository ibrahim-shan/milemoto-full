'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { formatOrderStatus, OrderStatusBadge } from './order-status';
import { toast } from 'sonner';

import { OrderTaxLinesBreakdown } from '@/features/orders/OrderTaxLinesBreakdown';
import { useAuth } from '@/hooks/useAuth';
import {
  cancelMyOrderRequest,
  createMyOrderRequest,
  fetchMyOrderById,
  fetchMyOrderRequestsForOrder,
} from '@/lib/checkout';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import type { CustomerOrderDetailResponse, OrderRequestItem } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Button } from '@/ui/button';
import { FallbackImage } from '@/ui/fallback-image';
import { OrderTracking } from '@/ui/order-tracking';
import { StatusBadge } from '@/ui/status-badge';
import { Textarea } from '@/ui/textarea';

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

type RequestType = OrderRequestItem['type'];

function formatRequestType(value: RequestType): string {
  if (value === 'cancel') return 'Cancellation';
  if (value === 'return') return 'Return';
  return 'Refund';
}

function requestStatusVariant(
  status: OrderRequestItem['status'],
): 'info' | 'warning' | 'success' | 'error' | 'neutral' {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'error';
  return 'neutral';
}

function isActiveRequest(status: OrderRequestItem['status']) {
  return status === 'pending' || status === 'approved';
}

function requestOutcomeSummary(request: OrderRequestItem): string {
  if (request.type === 'cancel') {
    if (request.status === 'completed') return 'Cancellation fully completed.';
    if (request.status === 'approved') return 'Order cancellation approved and processed.';
    if (request.status === 'pending') return 'Pending admin review for cancellation.';
    if (request.status === 'rejected') return 'Cancellation request rejected.';
    return 'Cancellation request withdrawn by customer.';
  }

  if (request.type === 'return') {
    if (request.status === 'completed') return 'Return completed and stock was restocked.';
    if (request.status === 'approved') return 'Return approved. Awaiting final completion/restock.';
    if (request.status === 'pending') return 'Pending admin review for return.';
    if (request.status === 'rejected') return 'Return request rejected.';
    return 'Return request withdrawn by customer.';
  }

  if (request.status === 'completed') return 'Refund completed and payment status was updated.';
  if (request.status === 'approved') return 'Refund approved. Awaiting final completion.';
  if (request.status === 'pending') return 'Pending admin review for refund.';
  if (request.status === 'rejected') return 'Refund request rejected.';
  return 'Refund request withdrawn by customer.';
}

export function OrderDetailClient({ orderId }: { orderId: number }) {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<CustomerOrderDetailResponse | null>(null);
  const [orderRequests, setOrderRequests] = useState<OrderRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [withdrawLoadingId, setWithdrawLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/signin?next=/account/orders/${orderId}`);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchMyOrderById(orderId),
      fetchMyOrderRequestsForOrder(orderId, { page: 1, limit: 50 }),
    ])
      .then(([orderData, requestsData]) => {
        if (cancelled) return;
        setOrder(orderData);
        setOrderRequests(requestsData.items ?? []);
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
  const canRequestCancel =
    order.status === 'pending_confirmation' ||
    order.status === 'confirmed' ||
    order.status === 'processing';
  const canRequestReturnOrRefund = order.status === 'delivered';

  const activeCancelRequest = orderRequests.find(
    request => request.type === 'cancel' && isActiveRequest(request.status),
  );
  const activeReturnRequest = orderRequests.find(
    request => request.type === 'return' && isActiveRequest(request.status),
  );
  const activeRefundRequest = orderRequests.find(
    request => request.type === 'refund' && isActiveRequest(request.status),
  );
  const eligibilityNotes: string[] = [];
  if (!canRequestCancel) {
    eligibilityNotes.push('Cancellation requests are available only before shipment.');
  }
  if (!canRequestReturnOrRefund) {
    eligibilityNotes.push('Return/refund requests are available only after delivery.');
  }
  if (activeCancelRequest || activeReturnRequest || activeRefundRequest) {
    eligibilityNotes.push(
      'You already have active request(s). Submit new requests after resolution.',
    );
  }

  const openRequestDialog = (type: RequestType) => {
    setRequestType(type);
    setRequestReason('');
    setRequestDialogOpen(true);
  };

  const submitRequest = async () => {
    if (!order || !requestType || requestLoading) return;
    const reason = requestReason.trim();
    if (!reason) {
      toast.error('Please provide a reason for your request.');
      return;
    }

    try {
      setRequestLoading(true);
      const created = await createMyOrderRequest(order.id, {
        type: requestType,
        reason,
      });
      setOrderRequests(prev => [created, ...prev]);
      setRequestDialogOpen(false);
      setRequestReason('');
      setRequestType(null);
      toast.success(`${formatRequestType(created.type)} request submitted`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to submit request');
    } finally {
      setRequestLoading(false);
    }
  };

  const withdrawRequest = async (request: OrderRequestItem) => {
    if (request.status !== 'pending' || withdrawLoadingId !== null) return;
    try {
      setWithdrawLoadingId(request.id);
      const updated = await cancelMyOrderRequest(request.id);
      setOrderRequests(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast.success('Request withdrawn');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to withdraw request');
    } finally {
      setWithdrawLoadingId(null);
    }
  };

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
          {canRequestCancel ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={Boolean(activeCancelRequest)}
              onClick={() => openRequestDialog('cancel')}
            >
              {activeCancelRequest ? 'Cancel Request Active' : 'Request Cancellation'}
            </Button>
          ) : null}
          {canRequestReturnOrRefund ? (
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(activeReturnRequest)}
              onClick={() => openRequestDialog('return')}
            >
              {activeReturnRequest ? 'Return Request Active' : 'Request Return'}
            </Button>
          ) : null}
          {canRequestReturnOrRefund ? (
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(activeRefundRequest)}
              onClick={() => openRequestDialog('refund')}
            >
              {activeRefundRequest ? 'Refund Request Active' : 'Request Refund'}
            </Button>
          ) : null}
        </div>
        {eligibilityNotes.length > 0 ? (
          <div className="bg-muted/40 mt-3 rounded-md border p-3">
            <p className="text-sm font-medium">Request Eligibility</p>
            <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-5 text-xs">
              {eligibilityNotes.map(note => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
                <div className="flex min-w-0 items-start gap-3">
                  <div className="border-border/60 bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-md border">
                    <FallbackImage
                      src={item.imageSrc}
                      fallbackSrc={IMAGE_PLACEHOLDERS.productSquare}
                      alt={item.productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
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
        <OrderTracking
          className="mt-4"
          entries={order.statusHistory}
          currentStatus={order.status}
          formatStatus={formatOrderStatus}
          formatDate={formatDate}
        />
      </section>

      <section className="border-border/60 bg-card rounded-xl border p-6">
        <h3 className="text-base font-semibold">Request History</h3>
        {orderRequests.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            No requests submitted for this order.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {orderRequests.map(request => (
              <div
                key={request.id}
                className="border-border/60 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">#{request.id}</p>
                    <p className="text-sm">{formatRequestType(request.type)}</p>
                    <StatusBadge variant={requestStatusVariant(request.status)}>
                      {request.status.replace(/_/g, ' ')}
                    </StatusBadge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Requested: {formatDate(request.requestedAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm">{request.reason || '-'}</p>
                {request.adminNote ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Admin note: {request.adminNote}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">
                  {requestOutcomeSummary(request)}
                </p>
                {request.status === 'pending' ? (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={withdrawLoadingId !== null}
                      onClick={() => void withdrawRequest(request)}
                    >
                      {withdrawLoadingId === request.id ? 'Withdrawing...' : 'Withdraw Request'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <AlertDialog
        open={requestDialogOpen}
        onOpenChange={open => {
          if (!requestLoading) setRequestDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {requestType ? `Submit ${formatRequestType(requestType)} Request` : 'Submit Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Explain why you are requesting this action for order
              <span className="text-foreground font-semibold"> {order.orderNumber}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={requestReason}
            onChange={event => setRequestReason(event.target.value)}
            placeholder="Enter your reason..."
            rows={4}
            aria-label="Request reason"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={requestLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void submitRequest();
              }}
              disabled={requestLoading}
            >
              {requestLoading ? 'Submitting...' : 'Submit Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export default OrderDetailClient;
