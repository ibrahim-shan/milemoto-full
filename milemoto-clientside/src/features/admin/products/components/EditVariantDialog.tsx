import { VariantForm } from './VariantForm';
import { ProductVariantDto } from '@milemoto/types';
import { FormProvider, useForm } from 'react-hook-form';

import type { ProductVariant } from '@/hooks/useProductQueries';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog';

interface EditVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: number;
    status: 'active' | 'inactive';
    brandId: number | null;
    categoryId: number | null;
  };
  variant?: ProductVariant | ProductVariantDto | undefined;
  existingSkus: string[];
  onSubmit: (variant: ProductVariantDto) => void;
}

export function EditVariantDialog({
  open,
  onOpenChange,
  product,
  variant,
  existingSkus,
  onSubmit,
}: EditVariantDialogProps) {
  const methods = useForm({
    defaultValues: {
      brandId: product.brandId,
      categoryId: product.categoryId,
    },
  });

  const defaultValues: ProductVariantDto | undefined = variant
    ? {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode || '',
        price: Number(variant.price),
        costPrice: variant.costPrice ? Number(variant.costPrice) : 0,
        lowStockThreshold: variant.lowStockThreshold || 0,
        idealStockQuantity: variant.idealStockQuantity || 0,
        status: variant.status || 'active',
        attributes: variant.attributes?.map(a => ({
          variantValueId: a.variantValueId,
        })),
        imagePath: variant.imagePath || (variant as ProductVariant).images?.[0]?.imagePath || '',
      }
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{variant ? `Edit Variant: ${variant.sku}` : 'Add Variant'}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <VariantForm
            productId={product.id}
            parentStatus={product.status}
            defaultValues={defaultValues}
            existingSkus={existingSkus}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
