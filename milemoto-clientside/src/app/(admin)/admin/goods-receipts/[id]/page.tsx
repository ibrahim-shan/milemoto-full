'use client';

import { useParams } from 'next/navigation';

import { AlertCircle, ArrowLeft, Link2 } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetGoodsReceipt } from '@/hooks/useGoodsReceiptQueries';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

export default function GoodsReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { formatDateTime } = useLocalizationFormat();

  const { data: grn, isLoading, isError } = useGetGoodsReceipt(Number.isNaN(id) ? null : id);

  return (
    <PermissionGuard requiredPermission="goods_receipts.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            href="/admin/goods-receipts"
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goods Receipts
          </Button>

          {grn && (
            <Button
              href={`/admin/purchase-orders/${grn.purchaseOrderId}`}
              variant="ghost"
              size="sm"
              leftIcon={<Link2 className="h-4 w-4" />}
            >
              View Purchase Order
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Goods Receipt Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : isError || !grn ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load goods receipt.</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">GRN Number</div>
                    <div className="font-mono text-sm">{grn.grnNumber}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Status</div>
                    <StatusBadge variant={grn.status === 'posted' ? 'success' : 'neutral'}>
                      {grn.status}
                    </StatusBadge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Purchase Order</div>
                    <div className="text-sm">
                      <span className="font-mono">
                        {grn.purchaseOrderNumber ?? `#${grn.purchaseOrderId}`}
                      </span>
                      {grn.purchaseOrderSubject && (
                        <span className="text-muted-foreground ml-2">
                          &ndash; {grn.purchaseOrderSubject}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Created At</div>
                    <div className="text-sm">{formatDateTime(grn.createdAt)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Posted At</div>
                    <div className="text-sm">
                      {grn.postedAt ? formatDateTime(grn.postedAt) : 'Not posted yet'}
                    </div>
                  </div>
                </div>

                {/* Note */}
                {grn.note && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Note</div>
                    <div className="whitespace-pre-wrap text-sm">{grn.note}</div>
                  </div>
                )}

                {/* Lines */}
                <div className="space-y-3">
                  <div className="text-muted-foreground text-xs font-semibold uppercase">
                    Receipt Lines
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Line</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Rejected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!grn.lines || grn.lines.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-muted-foreground text-center"
                          >
                            No lines recorded on this goods receipt.
                          </TableCell>
                        </TableRow>
                      ) : (
                        grn.lines.map(line => (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-xs">
                              #{line.purchaseOrderLineId}
                            </TableCell>
                            <TableCell>{line.receivedQty}</TableCell>
                            <TableCell>{line.rejectedQty}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
