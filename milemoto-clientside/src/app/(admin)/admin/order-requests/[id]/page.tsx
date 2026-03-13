import { notFound } from 'next/navigation';

import { AdminOrderRequestDetailClient } from '@/features/admin/orders/AdminOrderRequestDetailClient';

export default async function AdminOrderRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  const id = Number(resolved.id);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  return <AdminOrderRequestDetailClient requestId={id} />;
}
