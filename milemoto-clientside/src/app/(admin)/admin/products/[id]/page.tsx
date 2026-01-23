'use client';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { EditVariantDialog } from '@/features/admin/products/components/EditVariantDialog';
import { ProductDetailsHeader } from '@/features/admin/products/components/product-details-header';
import { ProductInventoryTab } from '@/features/admin/products/components/product-inventory-tab';
import { ProductOverviewTab } from '@/features/admin/products/components/product-overview-tab';
import { ProductVariantsTab } from '@/features/admin/products/components/product-variants-tab';
import { useProductDetailsPage } from '@/features/admin/products/hooks/useProductDetailsPage';
import { Button } from '@/ui/button';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/ui/Tabs';

export default function ProductDetailsPage() {
  const {
    product,
    isLoading,
    error,
    onBack,
    variantSearch,
    onVariantSearchChange,
    filteredVariants,
    formatCurrency,
    getVariantActionItems,
    editingVariant,
    onEditingVariantChange,
    existingSkus,
    onSubmitVariant,
    confirmOpen,
    confirmDescription,
    confirmTitle,
    onConfirmOpenChange,
    onConfirmDelete,
    inventoryRows,
    isStockLoading,
    isStockError,
    onRetryStockLevels,
  } = useProductDetailsPage();

  if (isLoading) {
    return <div className="p-8 text-center">Loading product details...</div>;
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive mb-4">Failed to load product details.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPermission="products.read">
      <div className="space-y-8">
        <ProductDetailsHeader
          name={product.name}
          slug={product.slug}
          status={product.status}
          onBack={onBack}
        />

        <Tabs
          defaultValue="overview"
          className="w-full space-y-6"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants ({product.variants?.length || 0})</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <ProductOverviewTab product={product} />

          <ProductVariantsTab
            search={variantSearch}
            onSearchChange={onVariantSearchChange}
            variants={filteredVariants}
            formatCurrency={formatCurrency}
            getActionItems={getVariantActionItems}
          />

          <ProductInventoryTab
            rows={inventoryRows}
            hasVariants={Boolean(product.variants?.length)}
            isLoading={isStockLoading}
            isError={isStockError}
            onRetry={onRetryStockLevels}
          />
        </Tabs>

        {editingVariant && (
          <EditVariantDialog
            open={!!editingVariant}
            onOpenChange={open => !open && onEditingVariantChange(null)}
            product={product}
            variant={editingVariant}
            existingSkus={existingSkus}
            onSubmit={onSubmitVariant}
          />
        )}

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={onConfirmOpenChange}
          title={confirmTitle}
          description={confirmDescription}
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={onConfirmDelete}
        />
      </div>
    </PermissionGuard>
  );
}
