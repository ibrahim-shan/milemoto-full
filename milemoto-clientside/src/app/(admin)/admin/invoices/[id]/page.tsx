import { notFound } from 'next/navigation';

import { AdminInvoiceDetailClient } from '@/features/admin/invoices/AdminInvoiceDetailClient';

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    notFound();
  }

  return <AdminInvoiceDetailClient invoiceId={invoiceId} />;
}

