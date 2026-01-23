'use client';

import { useMemo, useState } from 'react';

import { useGetAllProductVariants } from '@/hooks/useProductQueries';
import { useGetStockLocations } from '@/hooks/useStockLocationQueries';
import { useCreateStockAdjustment } from '@/hooks/useStockQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type StockAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StockAdjustmentDialog({ open, onOpenChange }: StockAdjustmentDialogProps) {
  const [productVariantId, setProductVariantId] = useState<number | null>(null);
  const [stockLocationId, setStockLocationId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [note, setNote] = useState('');

  const { data: variantsData } = useGetAllProductVariants({ page: 1, limit: 100, search: '' });
  const { data: locationsData } = useGetStockLocations({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
    type: undefined,
  });

  const variants = variantsData?.items ?? [];
  const locations = locationsData?.items ?? [];

  const createAdjustment = useCreateStockAdjustment();

  const canSubmit = useMemo(() => {
    if (!productVariantId || !stockLocationId) return false;
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum === 0) return false;
    return true;
  }, [productVariantId, stockLocationId, quantity]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !createAdjustment.isPending) {
      onOpenChange(false);
      setProductVariantId(null);
      setStockLocationId(null);
      setQuantity('');
      setNote('');
    } else {
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !productVariantId || !stockLocationId) return;

    const qtyNum = Number(quantity);
    try {
      await createAdjustment.mutateAsync({
        productVariantId,
        stockLocationId,
        quantity: qtyNum,
        note: note || undefined,
      });
      handleClose(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Stock Adjustment</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Product Variant</Label>
            <div className="col-span-3">
              <GeneralCombobox
                placeholder="Select variant"
                value={productVariantId ? String(productVariantId) : ''}
                onChange={val => setProductVariantId(Number(val))}
                className="w-full"
                data={variants.map(v => ({
                  value: String(v.id),
                  label: `${v.sku} - ${v.productName} / ${v.variantName}`,
                  searchValue: `${v.sku} ${v.productName} ${v.variantName}`,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Location</Label>
            <div className="col-span-3">
              <GeneralCombobox
                placeholder="Select location"
                value={stockLocationId ? String(stockLocationId) : ''}
                onChange={val => setStockLocationId(Number(val))}
                className="w-full"
                data={locations.map(loc => ({
                  value: String(loc.id),
                  label: loc.name,
                  searchValue: loc.name,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="adjustment-quantity"
              className="text-right"
            >
              Quantity
            </Label>
            <div className="col-span-3">
              <Input
                id="adjustment-quantity"
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Positive to add, negative to remove"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="adjustment-note"
              className="text-right"
            >
              Note
            </Label>
            <div className="col-span-3">
              <Input
                id="adjustment-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reason for adjustment (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createAdjustment.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              disabled={!canSubmit || createAdjustment.isPending}
            >
              {createAdjustment.isPending ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
