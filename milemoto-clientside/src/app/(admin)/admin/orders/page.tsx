import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function OrdersPage() {
  return (
    <PermissionGuard requiredPermission="orders.read">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-2">This is the orders page.</p>
      </div>
    </PermissionGuard>
  );
}
