import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function DashboardPage() {
  return (
    <PermissionGuard requiredPermission="dashboard.read">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">This is the admin dashboard.</p>
      </div>
    </PermissionGuard>
  );
}
