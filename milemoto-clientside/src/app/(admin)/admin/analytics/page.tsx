import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function AnalyticsPage() {
  return (
    <PermissionGuard requiredPermission="analytics.read">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">This is the analytics/reports page.</p>
      </div>
    </PermissionGuard>
  );
}
