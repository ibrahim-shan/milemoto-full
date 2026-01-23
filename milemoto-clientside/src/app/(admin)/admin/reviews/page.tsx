import { PermissionGuard } from '@/features/admin/components/PermissionGuard';

export default function ReviewsPage() {
  return (
    <PermissionGuard requiredPermission="reviews.read">
      <div>
        <h1 className="text-2xl font-bold">Product Reviews</h1>
        <p className="text-muted-foreground mt-2">This is the product reviews page.</p>
      </div>
    </PermissionGuard>
  );
}
