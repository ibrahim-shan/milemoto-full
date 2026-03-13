'use client';

import {
  CheckCircle2,
  CircleDashed,
  PackageCheck,
  PackageOpen,
  Truck,
  XCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { StatusBadge } from '@/ui/status-badge';

type TrackingEntry = {
  id: number;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
};

type OrderTrackingProps = {
  entries: TrackingEntry[];
  currentStatus: string;
  formatStatus: (status: string) => string;
  formatDate: (value: string) => string;
  className?: string;
};

function statusVariant(status: string): 'success' | 'warning' | 'info' | 'neutral' | 'error' {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'pending_confirmation':
    case 'processing':
      return 'warning';
    case 'confirmed':
    case 'shipped':
      return 'info';
    case 'cancelled':
      return 'error';
    default:
      return 'neutral';
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending_confirmation':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'confirmed':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'processing':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    case 'shipped':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return '';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'pending_confirmation':
      return CircleDashed;
    case 'confirmed':
      return CheckCircle2;
    case 'processing':
      return PackageOpen;
    case 'shipped':
      return Truck;
    case 'delivered':
      return PackageCheck;
    case 'cancelled':
      return XCircle;
    default:
      return CircleDashed;
  }
}

function statusSubtitle(status: string) {
  switch (status) {
    case 'pending_confirmation':
      return 'We received your order and are reviewing it.';
    case 'confirmed':
      return 'Your order has been confirmed.';
    case 'processing':
      return 'We are preparing your items for shipment.';
    case 'shipped':
      return 'Your order is on the way.';
    case 'delivered':
      return 'Your order has been delivered.';
    case 'cancelled':
      return 'This order was cancelled.';
    default:
      return null;
  }
}

export function OrderTracking({
  entries,
  currentStatus,
  formatStatus,
  formatDate,
  className,
}: OrderTrackingProps) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">No status updates yet.</p>;
  }

  const ordered = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className={cn('space-y-4', className)}>
      {ordered.map((entry, index) => {
        const Icon = statusIcon(entry.toStatus);
        const isLast = index === ordered.length - 1;
        const isCurrent = entry.toStatus === currentStatus && isLast;
        return (
          <div
            key={entry.id}
            className="relative flex gap-3"
          >
            <div className="relative flex w-8 justify-center">
              {!isLast ? (
                <span
                  aria-hidden
                  className="bg-border absolute bottom-0 top-8 w-px"
                />
              ) : null}
              <span
                className={cn(
                  'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border',
                  isCurrent
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <div
              className={cn(
                'border-border/60 flex-1 rounded-lg border p-3',
                isCurrent && 'border-primary/30 bg-primary/5',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge
                  variant={statusVariant(entry.toStatus)}
                  className={statusBadgeClass(entry.toStatus)}
                >
                  {formatStatus(entry.toStatus)}
                </StatusBadge>
                <span className="text-muted-foreground text-xs">{formatDate(entry.createdAt)}</span>
              </div>
              {statusSubtitle(entry.toStatus) ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {statusSubtitle(entry.toStatus)}
                </p>
              ) : null}
              {entry.reason ? (
                <p className="text-muted-foreground mt-2 text-sm">{entry.reason}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default OrderTracking;
