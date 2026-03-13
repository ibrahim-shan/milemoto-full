import { useState } from 'react';

import { Search } from 'lucide-react';

import type { ProductVariant } from '@/hooks/useProductQueries';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { FallbackImage } from '@/ui/fallback-image';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu, type TableActionItem } from '@/ui/table-actions-menu';
import { TabsContent } from '@/ui/Tabs';

type ProductVariantsTabProps = {
  productName: string;
  search: string;
  onSearchChange: (value: string) => void;
  variants: ProductVariant[];
  formatCurrency: (value: number) => string;
  getActionItems: (variant: ProductVariant) => TableActionItem[];
};

const VARIANT_COLUMNS = [
  { id: 'name', label: 'Name' as const },
  { id: 'sku', label: 'SKU' as const },
  { id: 'costPrice', label: 'Cost Price' as const },
  { id: 'sellingPrice', label: 'Selling Price' as const },
  { id: 'idealStock', label: 'Ideal Stock QT' as const },
  { id: 'status', label: 'Status' as const },
  { id: 'actions', label: 'Actions' as const, alwaysVisible: true },
] as const;

export function ProductVariantsTab({
  productName,
  search,
  onSearchChange,
  variants,
  formatCurrency,
  getActionItems,
}: ProductVariantsTabProps) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(VARIANT_COLUMNS.map(column => [column.id, true])),
  );

  const isColumnVisible = (id: string) => {
    const column = VARIANT_COLUMNS.find(item => item.id === id);
    if (column && 'alwaysVisible' in column && column.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };

  const visibleColumnCount = VARIANT_COLUMNS.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  return (
    <TabsContent value="variants">
      <Card>
        <CardHeader>
          <CardTitle>Product Variants</CardTitle>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search variants..."
                className="pl-8"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                aria-label="Search variants"
              />
            </div>
            <ColumnVisibilityMenu
              columns={VARIANT_COLUMNS}
              visibility={columnVisibility}
              onToggle={(columnId, visible) =>
                setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('name') && <TableHead>Name</TableHead>}
                {isColumnVisible('sku') && <TableHead>SKU</TableHead>}
                {isColumnVisible('costPrice') && <TableHead>Cost Price</TableHead>}
                {isColumnVisible('sellingPrice') && <TableHead>Selling Price</TableHead>}
                {isColumnVisible('idealStock') && <TableHead>Ideal Stock QT</TableHead>}
                {isColumnVisible('status') && <TableHead>Status</TableHead>}
                {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length > 0 ? (
                variants.map(variant => (
                  <TableRow key={variant.id}>
                    {isColumnVisible('name') && (
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="border-border/60 bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                            <FallbackImage
                              src={variant.imagePath}
                              fallbackSrc={IMAGE_PLACEHOLDERS.productSquare}
                              alt={variant.name || variant.sku}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <p
                            className="truncate font-medium"
                            title={`${productName} / ${variant.name}`}
                          >
                            {productName} / {variant.name}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('sku') && (
                      <TableCell className="font-medium">{variant.sku}</TableCell>
                    )}
                    {isColumnVisible('costPrice') && (
                      <TableCell>
                        {variant.costPrice ? formatCurrency(variant.costPrice) : '-'}
                      </TableCell>
                    )}
                    {isColumnVisible('sellingPrice') && (
                      <TableCell>{formatCurrency(variant.price)}</TableCell>
                    )}
                    {isColumnVisible('idealStock') && (
                      <TableCell>{variant.idealStockQuantity || 0}</TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={variant.status === 'active' ? 'success' : 'neutral'}>
                          {variant.status}
                        </StatusBadge>
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <TableActionsMenu items={getActionItems(variant)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No variants found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

