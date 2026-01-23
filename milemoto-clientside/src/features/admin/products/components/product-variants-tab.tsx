import { Search } from 'lucide-react';

import type { ProductVariant } from '@/hooks/useProductQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu, type TableActionItem } from '@/ui/table-actions-menu';
import { TabsContent } from '@/ui/Tabs';

type ProductVariantsTabProps = {
  search: string;
  onSearchChange: (value: string) => void;
  variants: ProductVariant[];
  formatCurrency: (value: number) => string;
  getActionItems: (variant: ProductVariant) => TableActionItem[];
};

export function ProductVariantsTab({
  search,
  onSearchChange,
  variants,
  formatCurrency,
  getActionItems,
}: ProductVariantsTabProps) {
  return (
    <TabsContent value="variants">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Variants</CardTitle>
            <div className="relative w-64">
              <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search variants..."
                className="pl-8"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                aria-label="Search variants"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Ideal Stock QT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length > 0 ? (
                variants.map(variant => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variant.sku}</TableCell>
                    <TableCell>{variant.name}</TableCell>
                    <TableCell>
                      {variant.costPrice ? formatCurrency(variant.costPrice) : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(variant.price)}</TableCell>
                    <TableCell>{variant.idealStockQuantity || 0}</TableCell>
                    <TableCell>
                      <StatusBadge variant={variant.status === 'active' ? 'success' : 'neutral'}>
                        {variant.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <TableActionsMenu items={getActionItems(variant)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
