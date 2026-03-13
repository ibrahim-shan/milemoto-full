import { PurchaseOrderStatusBadge } from '@/features/admin/purchase-orders/purchase-order-status-badge';
import { Skeleton } from '@/features/feedback/Skeleton';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrderQueries';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import type { TableActionItem } from '@/ui/table-actions-menu';
import { TableActionsMenu } from '@/ui/table-actions-menu';
import { TableStateMessage } from '@/ui/table-state-message';

type CurrencyMeta = {
  id: number;
  symbol?: string | null;
};

type PurchaseOrdersTableProps = {
  items: PurchaseOrder[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  visibleColumnCount: number;
  isColumnVisible: (id: string) => boolean;
  currencies: CurrencyMeta[];
  currencyPosition: 'before' | 'after';
  decimals: number;
  formatDateTime: (value: string | Date | null | undefined) => string;
  getActionItems: (po: PurchaseOrder) => TableActionItem[];
  sortBy?: 'poNumber' | 'subject' | 'status' | 'total' | 'createdAt' | undefined;
  sortDir?: SortDirection | undefined;
  onSortChange: (sortBy?: string | undefined, sortDir?: SortDirection | undefined) => void;
};

export function PurchaseOrdersTable({
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
  sortBy,
  sortDir,
  onSortChange,
}: PurchaseOrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isColumnVisible('poNumber') && (
            <TableHead>
              <SortableTableHead
                label="PO #"
                columnKey="poNumber"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('subject') && (
            <TableHead>
              <SortableTableHead
                label="Subject"
                columnKey="subject"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('status') && (
            <TableHead>
              <SortableTableHead
                label="Status"
                columnKey="status"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('total') && (
            <TableHead>
              <SortableTableHead
                label="Total"
                columnKey="total"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('createdAt') && (
            <TableHead>
              <SortableTableHead
                label="Created At"
                columnKey="createdAt"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {isColumnVisible('poNumber') && (
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              )}
              {isColumnVisible('subject') && (
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
              )}
              {isColumnVisible('total') && (
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
              )}
              {isColumnVisible('createdAt') && (
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
              )}
              {isColumnVisible('actions') && (
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              )}
            </TableRow>
          ))
        ) : isError ? (
          <TableRow>
            <TableCell
              colSpan={visibleColumnCount}
              className="h-24 text-center text-red-500"
            >
              <TableStateMessage
                variant="error"
                message="Failed to load purchase orders. Please try again."
                onRetry={refetch}
              />
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={visibleColumnCount}
              className="text-muted-foreground h-32 text-center"
            >
              <TableStateMessage
                variant="empty"
                message="No purchase orders found."
              />
            </TableCell>
          </TableRow>
        ) : (
          items.map(po => (
            <TableRow key={po.id}>
              {isColumnVisible('poNumber') && (
                <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
              )}
              {isColumnVisible('subject') && (
                <TableCell className="max-w-xs truncate">{po.subject}</TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell>
                  <PurchaseOrderStatusBadge status={po.status} />
                </TableCell>
              )}
              {isColumnVisible('total') && (
                <TableCell>
                  {(() => {
                    const total = Number(po.total ?? 0);
                    const currency = currencies.find(c => c.id === po.currencyId);
                    const base = total.toFixed(decimals);
                    if (!currency || !currency.symbol) return base;
                    return currencyPosition === 'before'
                      ? `${currency.symbol} ${base}`
                      : `${base} ${currency.symbol}`;
                  })()}
                </TableCell>
              )}
              {isColumnVisible('createdAt') && (
                <TableCell>{formatDateTime(po.createdAt)}</TableCell>
              )}
              {isColumnVisible('actions') && (
                <TableCell className="text-right">
                  <TableActionsMenu items={getActionItems(po)} />
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
