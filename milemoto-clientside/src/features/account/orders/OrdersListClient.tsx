'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { OrderStatusBadge } from './order-status';

import { useAuth } from '@/hooks/useAuth';
import { fetchMyOrders } from '@/lib/checkout';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import type { CustomerOrderListItem } from '@/types';
import { Button } from '@/ui/button';
import { FallbackImage } from '@/ui/fallback-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu } from '@/ui/table-actions-menu';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function OrdersListClient() {
  const router = useRouter();
  const search = useSearchParams();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<CustomerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const placedOrderId = useMemo(() => {
    const raw = search.get('placed');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [search]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/signin?next=/account/orders');
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting request UI state before starting fetch
    setLoading(true);
    setError(null);
    fetchMyOrders()
      .then(res => {
        if (cancelled) return;
        setItems(res.items);
      })
      .catch(err => {
        if (cancelled) return;
        setError((err as { message?: string })?.message || 'Failed to load orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">Loading orders...</p>
      </article>
    );
  }

  return (
    <article className="border-border/60 bg-card rounded-xl border p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My Orders</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View your recent orders and track their status.
          </p>
        </div>
      </div>

      {placedOrderId ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Order placed successfully. Your order ID is #{placedOrderId}.
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading orders...</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">You have not placed any orders yet.</p>
          <Button
            href="/shop"
            variant="solid"
            size="sm"
          >
            Start Shopping
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(order => (
                  <TableRow
                    key={order.id}
                    className={placedOrderId === order.id ? 'bg-emerald-50/60' : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="border-border/60 bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                          <FallbackImage
                            src={order.imageSrc}
                            fallbackSrc={IMAGE_PLACEHOLDERS.productSquare}
                            alt={order.orderNumber}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <span>{order.orderNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">
                          {order.paymentMethod}
                        </span>
                        <OrderStatusBadge status={order.paymentStatus} />
                      </div>
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{formatDate(order.placedAt)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(order.grandTotal, order.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <TableActionsMenu
                          triggerLabel={`Actions for ${order.orderNumber}`}
                          items={[
                            {
                              label: 'View Order',
                              href: `/account/orders/${order.id}`,
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map(order => (
              <div
                key={order.id}
                className={`rounded-lg border p-4 ${placedOrderId === order.id ? 'border-emerald-200 bg-emerald-50/50' : 'border-border/60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="border-border/60 bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                      <FallbackImage
                        src={order.imageSrc}
                        fallbackSrc={IMAGE_PLACEHOLDERS.productSquare}
                        alt={order.orderNumber}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{order.orderNumber}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(order.placedAt)}</p>
                    </div>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{order.itemCount}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatMoney(order.grandTotal, order.currency)}
                  </span>
                </div>
                <div className="mt-3">
                  <Button
                    href={`/account/orders/${order.id}`}
                    variant="outline"
                    size="sm"
                    fullWidth
                    justify="center"
                  >
                    View Order
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

export default OrdersListClient;
