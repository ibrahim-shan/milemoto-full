'use client';

import { PurchaseOrdersTable } from '@/features/admin/purchase-orders/components/purchase-orders-table';
import { PurchaseOrdersToolbar } from '@/features/admin/purchase-orders/components/purchase-orders-toolbar';
import { usePurchaseOrdersPage } from '@/features/admin/purchase-orders/hooks/usePurchaseOrdersPage';
import { PurchaseOrderDialog } from '@/features/admin/purchase-orders/purchase-order-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';

export default function PurchaseOrdersPage() {
  const {
    columns,
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
    currencies,
    currencyPosition,
    decimals,
    formatDateTime,
    getActionItems,
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange,
    onPageSizeChange,
    dialogKey,
    dialogOpen,
    onDialogOpenChange,
    purchaseOrder,
    onSubmitPurchaseOrder,
    confirmOpen,
    confirmTitle,
    confirmDescription,
    onConfirmOpenChange,
    onConfirmAction,
    isAnyActionLoading,
  } = usePurchaseOrdersPage();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersToolbar
            search={search}
            onSearchChange={onSearchChange}
            columns={columns}
            columnVisibility={columnVisibility}
            onToggleColumn={onToggleColumn}
            onAdd={onAdd}
          />

          <PurchaseOrdersTable
            items={items}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            visibleColumnCount={visibleColumnCount}
            isColumnVisible={isColumnVisible}
            currencies={currencies}
            currencyPosition={currencyPosition}
            decimals={decimals}
            formatDateTime={formatDateTime}
            getActionItems={getActionItems}
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

      <PurchaseOrderDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        purchaseOrder={purchaseOrder}
        onSubmit={onSubmitPurchaseOrder}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={onConfirmOpenChange}
        title={confirmTitle}
        description={confirmDescription}
        onConfirm={onConfirmAction}
        confirmDisabled={isAnyActionLoading}
        cancelDisabled={isAnyActionLoading}
        closeOnOutsideClick
        closeOnEscape
      />
    </>
  );
}
