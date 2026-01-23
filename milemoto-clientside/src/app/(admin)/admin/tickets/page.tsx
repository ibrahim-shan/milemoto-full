import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function TicketsPage() {
  return (
    <PermissionGuard requiredPermission="support_tickets.read">
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground mt-2">This is the support tickets page.</p>
      </div>
    </PermissionGuard>
  );
}
