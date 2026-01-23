'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import type { ProductVariantDto, UpdateProductDto } from '@milemoto/types';
import { Edit, Trash } from 'lucide-react';

import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetProduct, useUpdateProduct, type ProductVariant } from '@/hooks/useProductQueries';
import { useGetStockLevels } from '@/hooks/useStockQueries';
import type { TableActionItem } from '@/ui/table-actions-menu';

import type { ProductInventoryRow } from '../types';

export function useProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id ? parseInt(params.id as string) : null;

  const { data: product, isLoading, error } = useGetProduct(id);
  const updateMutation = useUpdateProduct();
  const stockLevelParams = id ? { page: 1, limit: 100, productId: id } : { page: 1, limit: 100 };
  const {
    data: stockLevelsData,
    isLoading: isStockLoading,
    isError: isStockError,
    refetch: refetchStockLevels,
  } = useGetStockLevels(stockLevelParams, { enabled: Boolean(id) });

  const { formatCurrency } = useDefaultCurrency();

  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);
  const [variantSearch, setVariantSearch] = useState('');

  const filteredVariants = useMemo(() => {
    const variants = product?.variants ?? [];
    if (!variantSearch.trim()) return variants;
    const searchTerms = variantSearch.toLowerCase().trim().split(/\s+/);
    return variants.filter(variant => {
      const name = variant.name.toLowerCase();
      const sku = variant.sku.toLowerCase();
      return searchTerms.every(term => name.includes(term) || sku.includes(term));
    });
  }, [product?.variants, variantSearch]);

  const inventoryByVariant = useMemo(() => {
    const stockLevels = stockLevelsData?.items ?? [];
    const map = new Map<number, { onHand: number; allocated: number; onOrder: number }>();
    for (const level of stockLevels) {
      const variantId = Number(level.productVariantId);
      const current = map.get(variantId) ?? { onHand: 0, allocated: 0, onOrder: 0 };
      map.set(variantId, {
        onHand: current.onHand + Number(level.onHand ?? 0),
        allocated: current.allocated + Number(level.allocated ?? 0),
        onOrder: current.onOrder + Number(level.onOrder ?? 0),
      });
    }
    return map;
  }, [stockLevelsData?.items]);

  const inventoryRows = useMemo<ProductInventoryRow[]>(
    () =>
      (product?.variants ?? []).map(variant => {
        const totals = inventoryByVariant.get(variant.id) ?? {
          onHand: 0,
          allocated: 0,
          onOrder: 0,
        };
        return {
          variant,
          onHand: totals.onHand,
          onOrder: totals.onOrder,
          currentQty: totals.onHand - totals.allocated,
        };
      }),
    [inventoryByVariant, product?.variants],
  );

  const submitVariantUpdate = async (variants: ProductVariant[]) => {
    if (!product) return;

    const payload: UpdateProductDto = {
      variants: variants.map(v => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || '',
        price: Number(v.price),
        costPrice: v.costPrice ? Number(v.costPrice) : 0,
        lowStockThreshold: v.lowStockThreshold ?? 0,
        idealStockQuantity: v.idealStockQuantity || 0,
        name: v.name,
        status: v.status || 'active',
        attributes: v.attributes?.map(a => ({ variantValueId: a.variantValueId })),
        imagePath: v.imagePath ?? v.images?.[0]?.imagePath,
      })),
    };

    await updateMutation.mutateAsync({ id: product.id, data: payload });
  };

  const handleVariantSubmit = async (updatedVariantData: ProductVariantDto) => {
    if (!product || !editingVariant) return;

    const updatedVariants = (product.variants ?? []).map<ProductVariant>(variant => {
      if (variant.id !== editingVariant.id) {
        return variant;
      }

      const nextVariant: ProductVariant = {
        ...variant,
        sku: updatedVariantData.sku,
        barcode: updatedVariantData.barcode || null,
        price: Number(updatedVariantData.price),
        costPrice: updatedVariantData.costPrice ?? null,
        lowStockThreshold: updatedVariantData.lowStockThreshold ?? variant.lowStockThreshold ?? 0,
        idealStockQuantity:
          updatedVariantData.idealStockQuantity ?? variant.idealStockQuantity ?? null,
        name: updatedVariantData.name,
        status: updatedVariantData.status,
      };

      if (updatedVariantData.attributes) {
        nextVariant.attributes = updatedVariantData.attributes.map(attr => {
          const existingAttr = variant.attributes?.find(
            a => a.variantValueId === attr.variantValueId,
          );
          return {
            id: existingAttr?.id ?? attr.variantValueId,
            productVariantId: variant.id,
            variantValueId: attr.variantValueId,
            createdAt: existingAttr?.createdAt ?? new Date().toISOString(),
            updatedAt: existingAttr?.updatedAt ?? new Date().toISOString(),
          };
        });
      }

      if (updatedVariantData.imagePath !== undefined) {
        nextVariant.imagePath = updatedVariantData.imagePath;
      }

      return nextVariant;
    });

    await submitVariantUpdate(updatedVariants);
    setEditingVariant(null);
  };

  const confirmDeleteVariant = async () => {
    if (!product || !variantToDelete) return;

    const updatedVariants =
      product.variants?.filter(variant => variant.id !== variantToDelete.id) || [];
    await submitVariantUpdate(updatedVariants);
    setVariantToDelete(null);
  };

  const existingSkus = useMemo(
    () =>
      product?.variants
        ?.filter(variant => variant.id !== editingVariant?.id)
        .map(variant => variant.sku) || [],
    [editingVariant?.id, product?.variants],
  );

  const getVariantActionItems = (variant: ProductVariant): TableActionItem[] => [
    {
      label: 'Edit',
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => setEditingVariant(variant),
    },
    {
      label: 'Delete',
      icon: <Trash className="mr-2 h-4 w-4" />,
      onClick: () => setVariantToDelete(variant),
      destructive: true,
    },
  ];

  const confirmDescription = variantToDelete
    ? `Are you sure you want to delete the variant "${variantToDelete.name}"? This action cannot be undone.`
    : '';

  return {
    product,
    isLoading,
    error,
    onBack: () => router.back(),
    variantSearch,
    onVariantSearchChange: setVariantSearch,
    filteredVariants,
    formatCurrency,
    getVariantActionItems,
    editingVariant,
    onEditingVariantChange: setEditingVariant,
    existingSkus,
    onSubmitVariant: handleVariantSubmit,
    confirmOpen: !!variantToDelete,
    confirmTitle: 'Delete Variant',
    confirmDescription,
    onConfirmOpenChange: (open: boolean) => !open && setVariantToDelete(null),
    onConfirmDelete: confirmDeleteVariant,
    inventoryRows,
    isStockLoading,
    isStockError,
    onRetryStockLevels: refetchStockLevels,
  };
}
