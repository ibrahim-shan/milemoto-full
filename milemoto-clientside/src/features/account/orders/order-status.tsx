'use client';

import { StatusBadge } from '@/ui/status-badge';

function toStatusVariant(status: string): 'success' | 'warning' | 'info' | 'neutral' | 'error' {
  switch (status) {
    case 'delivered':
    case 'paid':
      return 'success';
    case 'pending_confirmation':
    case 'processing':
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

function prettifyStatus(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge variant={toStatusVariant(status)}>{prettifyStatus(status)}</StatusBadge>;
}

export function formatOrderStatus(status: string) {
  return prettifyStatus(status);
}
