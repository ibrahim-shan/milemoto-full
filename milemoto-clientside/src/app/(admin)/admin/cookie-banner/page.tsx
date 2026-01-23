import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function CookieBannerPage() {
  return (
    <PermissionGuard requiredPermission="cookie_banner.read">
      <div>
        <h1 className="text-2xl font-bold">Cookie Banner</h1>
        <p className="text-muted-foreground mt-2">This is the cookie banner settings page.</p>
      </div>
    </PermissionGuard>
  );
}
