import AdminReviewDetailClient from '@/features/admin/reviews/AdminReviewDetailClient';

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reviewId = Number(id);

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    return <div className="text-sm text-red-600">Invalid review id.</div>;
  }

  return <AdminReviewDetailClient reviewId={reviewId} />;
}
