import React, { useState } from 'react';

import { PrintConfigDialog } from './PrintConfigDialog';
import { Download, MoreHorizontal, Printer, Search } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { ProductVariantItem, useGetAllProductVariants } from '@/hooks/useProductQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Checkbox } from '@/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function BarcodeTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set());
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // If printing a single item from row action
  const [singlePrintItem, setSinglePrintItem] = useState<ProductVariantItem | null>(null);

  const { formatCurrency } = useDefaultCurrency();

  const { data, isLoading, isError, refetch } = useGetAllProductVariants({
    page,
    limit: pageSize,
    search,
  });

  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      const newSelected = new Set(selectedVariants);
      data.items.forEach(item => newSelected.add(item.id));
      setSelectedVariants(newSelected);
    } else {
      // Deselect current page items
      const newSelected = new Set(selectedVariants);
      data?.items.forEach(item => newSelected.delete(item.id));
      setSelectedVariants(newSelected);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedVariants);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedVariants(newSelected);
  };

  const isAllSelected =
    (data?.items?.length ?? 0) > 0 &&
    (data?.items?.every(item => selectedVariants.has(item.id)) ?? false);

  const getSelectedItems = () => {
    if (singlePrintItem) return [singlePrintItem];
    if (!data) return [];
    return data.items.filter(item => selectedVariants.has(item.id));
  };

  const handleExport = () => {
    const itemsToExport = getSelectedItems();
    if (itemsToExport.length === 0) return;

    const csvContent = [
      ['ID', 'Product Name', 'Variant Name', 'SKU', 'Barcode', 'Price'],
      ...itemsToExport.map(item => [
        item.id,
        `"${item.productName}"`,
        `"${item.variantName}"`,
        item.sku,
        item.barcode || '',
        item.price,
      ]),
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'barcodes_export.csv';
    link.click();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Barcode Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="relative w-full sm:max-w-sm">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search by SKU, Barcode, Name..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search variants"
              />
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={selectedVariants.size === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="solid"
                onClick={() => {
                  setSinglePrintItem(null);
                  setIsPrintDialogOpen(true);
                }}
                disabled={selectedVariants.size === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Selected ({selectedVariants.size})
              </Button>
            </div>
          </div>

          {/* Table */}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12.5">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={c => handleSelectAll(c === true)}
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead>Product / Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load variants. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No variants found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVariants.has(item.id)}
                        onCheckedChange={c => handleSelectRow(item.id, !!c)}
                        aria-label={`Select ${item.productName} - ${item.variantName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground text-sm">{item.variantName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-mono text-sm">{item.barcode || '-'}</TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            justify="center"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSinglePrintItem(item);
                              setIsPrintDialogOpen(true);
                            }}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Print Label
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {totalPages} (Total {totalCount} items)
              </div>
              <PaginationControls
                currentPage={page}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={next => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <PrintConfigDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        selectedVariants={getSelectedItems()}
      />
    </>
  );
}
