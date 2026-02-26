'use client';

import { useMemo, useState } from 'react';

import { useGetAllProductVariants } from '@/hooks/useProductQueries';
import { useGetStockLocations } from '@/hooks/useStockLocationQueries';
import { useCreateStockTransfer } from '@/hooks/useStockQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type StockTransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StockTransferDialog({ open, onOpenChange }: StockTransferDialogProps) {
  const [productVariantId, setProductVariantId] = useState<number | null>(null);
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
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

  const createTransfer = useCreateStockTransfer();

  const canSubmit = useMemo(() => {
    if (!productVariantId || !fromLocationId || !toLocationId) return false;
    if (fromLocationId === toLocationId) return false;
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return false;
    return true;
  }, [productVariantId, fromLocationId, toLocationId, quantity]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !createTransfer.isPending) {
      onOpenChange(false);
      setProductVariantId(null);
      setFromLocationId(null);
      setToLocationId(null);
      setQuantity('');
      setNote('');
    } else {
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !productVariantId || !fromLocationId || !toLocationId) return;

    const qtyNum = Number(quantity);
    try {
      await createTransfer.mutateAsync({
        productVariantId,
        fromLocationId,
        toLocationId,
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
          <DialogTitle>New Stock Transfer</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transfer-product-variant">Product Variant</Label>
            <div className="col-span-3">
              <GeneralCombobox
                id="transfer-product-variant"
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
            <Label htmlFor="transfer-from-location">From Location</Label>
            <div className="col-span-3">
              <GeneralCombobox
                id="transfer-from-location"
                placeholder="Select source location"
                value={fromLocationId ? String(fromLocationId) : ''}
                onChange={val => setFromLocationId(Number(val))}
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
            <Label htmlFor="transfer-to-location">To Location</Label>
            <div className="col-span-3">
              <GeneralCombobox
                id="transfer-to-location"
                placeholder="Select destination location"
                value={toLocationId ? String(toLocationId) : ''}
                onChange={val => setToLocationId(Number(val))}
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
            <Label htmlFor="transfer-quantity">Quantity</Label>
            <div className="col-span-3">
              <Input
                id="transfer-quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Quantity to transfer"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transfer-note">Note</Label>
            <div className="col-span-3">
              <Input
                id="transfer-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reason for transfer (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createTransfer.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              disabled={!canSubmit || createTransfer.isPending}
            >
              {createTransfer.isPending ? 'Saving...' : 'Save Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
