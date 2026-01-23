import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function SocialMediaPage() {
  return (
    <PermissionGuard requiredPermission="social_media.read">
      <div>
        <h1 className="text-2xl font-bold">Social Media</h1>
        <p className="text-muted-foreground mt-2">This is the social media page.</p>
      </div>
    </PermissionGuard>
  );
}
