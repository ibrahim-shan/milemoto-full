import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function InvoicesPage() {
  return (
    <PermissionGuard requiredPermission="invoices.read">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-2">This is the invoices page.</p>
      </div>
    </PermissionGuard>
  );
}
