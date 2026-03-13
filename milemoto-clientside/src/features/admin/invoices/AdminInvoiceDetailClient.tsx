'use client';

import { useRef } from 'react';

import { ArrowLeft, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { downloadAdminInvoicePdf, fetchAdminInvoiceById } from '@/lib/admin-invoices';
import type { AdminInvoiceDetailResponse } from '@/types';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusVariant(status: AdminInvoiceDetailResponse['status']) {
  if (status === 'paid') return 'success';
  if (status === 'issued' || status === 'partially_paid') return 'warning';
  if (status === 'draft') return 'info';
  if (status === 'void') return 'error';
  return 'neutral';
}

export function AdminInvoiceDetailClient({ invoiceId }: { invoiceId: number }) {
  const downloadingRef = useRef(false);

  const {
    data: invoice,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery<AdminInvoiceDetailResponse, Error>({
    queryKey: ['adminInvoiceDetail', invoiceId],
    queryFn: () => fetchAdminInvoiceById(invoiceId),
  });

  const handleDownloadPdf = async () => {
    if (downloadingRef.current) return;
    try {
      downloadingRef.current = true;
      const { blob, filename } = await downloadAdminInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to download invoice PDF');
    } finally {
      downloadingRef.current = false;
    }
  };

  return (
    <PermissionGuard requiredPermission="invoices.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice Detail</h1>
          <div className="flex items-center gap-2">
            {invoice ? (
              <Button
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => void handleDownloadPdf()}
              >
                Download PDF
              </Button>
            ) : null}
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              href="/admin/invoices"
            >
              Back to Invoices
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">Loading invoice...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10">
              <TableStateMessage
                variant="error"
                message={error.message || 'Failed to load invoice'}
                onRetry={() => void refetch()}
              />
            </CardContent>
          </Card>
        ) : isError || !invoice ? (
          <Card>
            <CardContent className="py-10">
              <TableStateMessage
                variant="empty"
                message="Invoice not found."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{invoice.invoiceNumber}</span>
                  <StatusBadge variant={statusVariant(invoice.status)}>
                    {invoice.status.replace(/_/g, ' ')}
                  </StatusBadge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order:</span> {invoice.orderNumber}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer:</span> {invoice.customerName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {invoice.customerPhone}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Issued:</span> {formatDateTime(invoice.issuedAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due:</span> {formatDateTime(invoice.dueAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid:</span> {formatDateTime(invoice.paidAt)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-muted-foreground text-xs">{item.variantName || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.sku || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.unitPrice, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(item.lineTotal, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{formatMoney(invoice.discountTotal, invoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatMoney(invoice.shippingTotal, invoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatMoney(invoice.taxTotal, invoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(invoice.grandTotal, invoice.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

export default AdminInvoiceDetailClient;
