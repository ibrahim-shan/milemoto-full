import { StatusBadge } from '@/ui/status-badge';

const STATUS_VARIANTS: Record<
  string,
  'success' | 'neutral' | 'warning' | 'error' | 'info' | 'purple'
> = {
  fully_received: 'success',
  approved: 'info',
  partially_received: 'purple',
  pending_approval: 'warning',
  cancelled: 'error',
  rejected: 'error',
  draft: 'neutral',
  closed: 'neutral',
};

type PurchaseOrderStatusBadgeProps = {
  status: string; // strict typing would be better, but string is flexible for now
  className?: string;
};

export function PurchaseOrderStatusBadge({ status, className }: PurchaseOrderStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] || 'neutral';

  return (
    <StatusBadge
      variant={variant}
      className={className ?? ''}
    >
      {status.replace('_', ' ')}
    </StatusBadge>
  );
}
