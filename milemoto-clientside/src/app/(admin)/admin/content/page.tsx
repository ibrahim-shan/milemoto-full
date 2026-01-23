import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function PagesPage() {
  return (
    <PermissionGuard requiredPermission="pages.read">
      <div>
        <h1 className="text-2xl font-bold">Pages</h1>
        <p className="text-muted-foreground mt-2">This is the static page (CMS) management page.</p>
      </div>
    </PermissionGuard>
  );
}
