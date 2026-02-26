import type { Metadata } from 'next';

import OrderDetailClient from '@/features/account/orders/OrderDetailClient';

export const metadata: Metadata = {
  title: 'Order Details',
};

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold tracking-tight">Order Details</h2>
        <p className="text-muted-foreground mt-2">Invalid order ID.</p>
      </article>
    );
  }

  return <OrderDetailClient orderId={orderId} />;
}
