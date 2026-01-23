import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function DiscountsPage() {
  return (
    <PermissionGuard requiredPermission="discounts.read">
      <div>
        <h1 className="text-2xl font-bold">Discounts</h1>
        <p className="text-muted-foreground mt-2">This is the discounts/coupons page.</p>
      </div>
    </PermissionGuard>
  );
}
