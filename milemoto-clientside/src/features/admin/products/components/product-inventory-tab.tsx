import { AlertTriangle } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';
import { TabsContent } from '@/ui/Tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip';

import type { ProductInventoryRow } from '../types';

type ProductInventoryTabProps = {
  rows: ProductInventoryRow[];
  hasVariants: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function ProductInventoryTab({
  rows,
  hasVariants,
  isLoading,
  isError,
  onRetry,
}: ProductInventoryTabProps) {
  return (
    <TabsContent value="inventory">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Inventory Stock</TableHead>
                <TableHead>Low Stock Qty</TableHead>
                <TableHead>Ideal Stock</TableHead>
                <TableHead>Current Qty</TableHead>
                <TableHead>On Order Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load inventory. Please try again."
                      onRetry={onRetry}
                    />
                  </TableCell>
                </TableRow>
              ) : !hasVariants ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-24 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No variants found for this product."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.variant.id}>
                    <TableCell className="font-mono text-xs">{row.variant.sku}</TableCell>
                    <TableCell>{row.variant.name}</TableCell>
                    <TableCell>
                      {(() => {
                        const threshold = row.variant.lowStockThreshold;
                        const isLowStock =
                          threshold !== undefined && threshold !== null && row.onHand <= threshold;

                        if (isLowStock) {
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-destructive inline-flex items-center gap-2 font-medium">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>{row.onHand}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Low Stock! Threshold: {threshold}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }

                        return row.onHand;
                      })()}
                    </TableCell>
                    <TableCell>{row.variant.lowStockThreshold ?? 0}</TableCell>
                    <TableCell>{row.variant.idealStockQuantity ?? 0}</TableCell>
                    <TableCell>{row.currentQty}</TableCell>
                    <TableCell>{row.onOrder}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
