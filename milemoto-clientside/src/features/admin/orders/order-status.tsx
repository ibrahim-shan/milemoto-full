'use client';

import { StatusBadge } from '@/ui/status-badge';

type Variant = 'success' | 'warning' | 'info' | 'neutral' | 'error';

function toStatusVariant(status: string): Variant {
  switch (status) {
    case 'delivered':
    case 'paid':
      return 'success';
    case 'pending_confirmation':
    case 'processing':
    case 'unpaid':
      return 'warning';
    case 'confirmed':
    case 'shipped':
      return 'info';
    case 'cancelled':
    case 'failed':
    case 'refunded':
      return 'error';
    default:
      return 'neutral';
  }
}

export function formatAdminOrderStatus(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AdminOrderStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge variant={toStatusVariant(status)}>{formatAdminOrderStatus(status)}</StatusBadge>
  );
}
