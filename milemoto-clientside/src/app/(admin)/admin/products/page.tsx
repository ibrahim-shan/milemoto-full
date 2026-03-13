'use client';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { ProductsTable } from '@/features/admin/products/components/products-table';
import { ProductsToolbar } from '@/features/admin/products/components/products-toolbar';
import { useProductsPage } from '@/features/admin/products/hooks/useProductsPage';
import { ProductDialog } from '@/features/admin/products/product-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { StatsCards } from '@/ui/stats-cards';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';

export default function ProductsPage() {
  const {
    columns,
    filters,
    filterConfig,
    onFiltersChange,
    search,
    onSearchChange,
    columnVisibility,
    onToggleColumn,
    onAdd,
    items,
    isLoading,
    isError,
    refetch,
    visibleColumnCount,
    isColumnVisible,
    expandedRows,
    onToggleRow,
    getActionItems,
    sortBy,
    sortDir,
    onSortChange,
    stats,
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange,
    onPageSizeChange,
    dialogOpen,
    onDialogOpenChange,
    editingProduct,
    onSubmitProduct,
    isSubmitting,
    confirmOpen,
    confirmTitle,
    confirmDescription,
    onConfirmOpenChange,
    onConfirmAction,
    isDeleting,
  } = useProductsPage();

  return (
    <PermissionGuard requiredPermission="products.read">
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsCards data={stats} />

          <ProductsToolbar
            filterConfig={filterConfig}
            filters={filters}
            onFiltersChange={onFiltersChange}
            search={search}
            onSearchChange={onSearchChange}
            columns={columns}
            columnVisibility={columnVisibility}
            onToggleColumn={onToggleColumn}
            onAdd={onAdd}
          />

          <ProductsTable
            items={items}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            visibleColumnCount={visibleColumnCount}
            isColumnVisible={isColumnVisible}
            expandedRows={expandedRows}
            onToggleRow={onToggleRow}
            search={search}
            getActionItems={getActionItems}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
          />

          <TablePaginationFooter
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        product={editingProduct}
        onSubmit={onSubmitProduct}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={onConfirmOpenChange}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={onConfirmAction}
        confirmDisabled={isDeleting}
        cancelDisabled={isDeleting}
      />
    </PermissionGuard>
  );
}
