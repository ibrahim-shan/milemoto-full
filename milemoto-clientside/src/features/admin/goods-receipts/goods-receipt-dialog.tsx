'use client';

import { useMemo, useState } from 'react';

import type {
  CreateGoodsReceiptDto,
  GoodsReceiptResponse,
  PurchaseOrderResponse,
} from '@milemoto/types';
import { AlertCircle } from 'lucide-react';

import {
  useCreateGoodsReceipt,
  usePostGoodsReceipt,
  useUpdateGoodsReceipt,
} from '@/hooks/useGoodsReceiptQueries';
import { Button } from '@/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

type GoodsReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrderResponse;
  draftGoodsReceipt?: GoodsReceiptResponse | null;
};

type LineDraft = {
  purchaseOrderLineId: number;
  productVariantName: string;
  orderedQty: number;
  alreadyReceivedQty: number;
  alreadyRejectedQty: number;
  remainingQty: number;
  receivedQty: number;
  rejectedQty: number;
};

export function GoodsReceiptDialog({
  open,
  onOpenChange,
  purchaseOrder,
  draftGoodsReceipt,
}: GoodsReceiptDialogProps) {
  const createMutation = useCreateGoodsReceipt();
  const updateMutation = useUpdateGoodsReceipt();
  const postMutation = usePostGoodsReceipt();

  /*
   * Initialize state with computed lines.
   * We rely on the `key` prop on the Dialog to force a re-mount (and re-initialization)
   * whenever the dialog opens or the underlying data changes.
   */
  const initialLines = useMemo<LineDraft[]>(() => {
    const poLines = purchaseOrder.lines ?? [];

    return poLines
      .map(line => {
        const alreadyReceived = line.receivedQty ?? 0;
        const alreadyRejected = line.rejectedQty ?? 0;
        const remaining =
          line.orderedQty - alreadyReceived - alreadyRejected - (line.cancelledQty ?? 0);

        const existingLine = draftGoodsReceipt?.lines?.find(l => l.purchaseOrderLineId === line.id);

        const receivedQty =
          existingLine && existingLine.receivedQty > 0
            ? existingLine.receivedQty
            : remaining > 0
              ? remaining
              : 0;
        const rejectedQty = existingLine?.rejectedQty ?? 0;

        return {
          purchaseOrderLineId: line.id,
          productVariantName: `#${line.productVariantId}`,
          orderedQty: line.orderedQty,
          alreadyReceivedQty: alreadyReceived,
          alreadyRejectedQty: alreadyRejected,
          remainingQty: remaining,
          receivedQty,
          rejectedQty,
        };
      })
      .filter(l => l.remainingQty > 0);
  }, [purchaseOrder, draftGoodsReceipt]);

  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(initialLines);

  // useEffect removed to avoid set-state-in-effect warning.
  // Synchronization is handled by re-mounting via key.

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || postMutation.isPending;

  const hasValidLines = useMemo(
    () =>
      lines.some(
        l =>
          l.remainingQty > 0 &&
          (l.receivedQty > 0 || l.rejectedQty > 0) &&
          l.receivedQty + l.rejectedQty <= l.remainingQty,
      ),
    [lines],
  );

  const handleLineChange = (
    lineId: number,
    field: 'receivedQty' | 'rejectedQty',
    value: number,
  ) => {
    setLines(prev =>
      prev.map(line =>
        line.purchaseOrderLineId === lineId
          ? {
              ...line,
              [field]: value < 0 ? 0 : value,
            }
          : line,
      ),
    );
  };

  const buildPayload = (): CreateGoodsReceiptDto | null => {
    const validLines = lines
      .map(l => {
        const receivedQty = Number.isFinite(l.receivedQty) ? l.receivedQty : 0;
        const rejectedQty = Number.isFinite(l.rejectedQty) ? l.rejectedQty : 0;
        if (receivedQty === 0 && rejectedQty === 0) return null;
        if (receivedQty + rejectedQty > l.remainingQty) return null;

        return {
          purchaseOrderLineId: l.purchaseOrderLineId,
          receivedQty,
          rejectedQty: rejectedQty > 0 ? rejectedQty : undefined,
        };
      })
      .filter(Boolean) as CreateGoodsReceiptDto['lines'];

    if (validLines.length === 0) return null;

    return {
      purchaseOrderId: purchaseOrder.id,
      note: note || undefined,
      lines: validLines,
    };
  };

  const handleSubmit = async (postAfterCreate: boolean) => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const hasDraft = Boolean(draftGoodsReceipt && draftGoodsReceipt.status === 'draft');
      const grn = hasDraft
        ? await updateMutation.mutateAsync({ id: draftGoodsReceipt!.id, data: payload })
        : await createMutation.mutateAsync(payload);
      if (postAfterCreate) {
        await postMutation.mutateAsync(grn.id);
      }
      onOpenChange(false);
    } catch {
      // errors handled by hooks/toasts
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isSubmitting ? () => {} : onOpenChange}
      key={
        open
          ? draftGoodsReceipt?.id
            ? `edit-${draftGoodsReceipt.id}`
            : `create-${purchaseOrder.id}`
          : 'closed'
      }
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Goods Receipt</DialogTitle>
        </DialogHeader>

        {initialLines.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-4 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>All lines on this purchase order have already been fully received.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grn-note">Note (optional)</Label>
              <Input
                id="grn-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Internal note for this goods receipt"
              />
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold uppercase">
                Lines to Receive
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Already Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Receive Now</TableHead>
                    <TableHead className="text-right">Reject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground text-center"
                      >
                        No lines with remaining quantity.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map(line => {
                      const overAllocation =
                        line.receivedQty + line.rejectedQty > line.remainingQty;

                      return (
                        <TableRow key={line.purchaseOrderLineId}>
                          <TableCell>{line.productVariantName}</TableCell>
                          <TableCell className="text-right">{line.orderedQty}</TableCell>
                          <TableCell className="text-right">{line.alreadyReceivedQty}</TableCell>
                          <TableCell className="text-right">{line.remainingQty}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={line.remainingQty}
                              value={line.receivedQty}
                              onChange={e =>
                                handleLineChange(
                                  line.purchaseOrderLineId,
                                  'receivedQty',
                                  Number(e.target.value || 0),
                                )
                              }
                              className={overAllocation ? 'border-destructive' : ''}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={line.remainingQty}
                              value={line.rejectedQty}
                              onChange={e =>
                                handleLineChange(
                                  line.purchaseOrderLineId,
                                  'rejectedQty',
                                  Number(e.target.value || 0),
                                )
                              }
                              className={overAllocation ? 'border-destructive' : ''}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {!hasValidLines && (
                <p className="text-muted-foreground text-xs">
                  Enter received and/or rejected quantities (not exceeding remaining) for at least
                  one line.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting || !hasValidLines || initialLines.length === 0}
            onClick={() => handleSubmit(false)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="solid"
            disabled={isSubmitting || !hasValidLines || initialLines.length === 0}
            onClick={() => handleSubmit(true)}
          >
            Save &amp; Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
