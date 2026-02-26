import AdminOrderDetailClient from '@/features/admin/orders/AdminOrderDetailClient';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return <div className="text-sm text-red-600">Invalid order id.</div>;
  }

  return <AdminOrderDetailClient orderId={orderId} />;
}
