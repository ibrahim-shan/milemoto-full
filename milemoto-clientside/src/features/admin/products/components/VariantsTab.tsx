import { useState } from 'react';

import { CreateProductDto, ProductVariantDto } from '@milemoto/types';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';

import { EditVariantDialog } from '@/features/admin/products/components/EditVariantDialog';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { Button } from '@/ui/button';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

interface VariantsTabProps {
  productId?: number | undefined;
  parentStatus?: 'active' | 'inactive';
}

export function VariantsTab({ productId, parentStatus }: VariantsTabProps) {
  const { control, watch } = useFormContext<CreateProductDto>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'variants',
    keyName: 'fieldId',
  });

  const { formatCurrency } = useDefaultCurrency();

  const brandId = watch('brandId');
  const categoryId = watch('categoryId');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSaveVariant = (variant: ProductVariantDto) => {
    const newAttrIds = new Set(variant.attributes?.map(a => a.variantValueId) || []);

    const isDuplicate = fields.some((field, index) => {
      // If updating, skip the current variant being edited
      if (editingIndex !== null && index === editingIndex) return false;

      const existingVariant = field as unknown as ProductVariantDto;
      const existingAttrIds = new Set(existingVariant.attributes?.map(a => a.variantValueId) || []);

      if (newAttrIds.size !== existingAttrIds.size) return false;
      for (const id of newAttrIds) {
        if (!existingAttrIds.has(id)) return false;
      }
      return true;
    });

    if (isDuplicate) {
      toast.error('A variant with these attributes already exists.');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, variant);
      toast.success('Variant updated');
    } else {
      append(variant);
      toast.success('Variant added');
    }
    setIsDialogOpen(false);
  };

  const openAddDialog = () => {
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (index: number) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Construct mock product object for EditVariantDialog context
  const mockProductContext = {
    id: productId || 0,
    status: parentStatus || 'active',
    brandId: brandId || null,
    categoryId: categoryId || null,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Product Variants</h3>
        <Button
          type="button"
          onClick={openAddDialog}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Variant
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No variants added. Add at least one variant.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => (
                <TableRow key={field.fieldId}>
                  <TableCell>{field.name}</TableCell>
                  <TableCell>{field.sku}</TableCell>
                  <TableCell>{formatCurrency(field.costPrice)}</TableCell>
                  <TableCell>{formatCurrency(field.price)}</TableCell>
                  <TableCell>
                    <StatusBadge variant={field.status === 'active' ? 'success' : 'neutral'}>
                      {field.status || 'active'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        justify="center"
                        onClick={() => openEditDialog(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        justify="center"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditVariantDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={mockProductContext}
        variant={editingIndex !== null ? fields[editingIndex] : undefined}
        existingSkus={fields.map(f => f.sku)}
        onSubmit={handleSaveVariant}
      />
    </div>
  );
}
