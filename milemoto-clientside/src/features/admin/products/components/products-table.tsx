import { Skeleton } from '@/features/feedback/Skeleton';
import type { Product } from '@/hooks/useProductQueries';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import { cn } from '@/lib/utils';
import { FallbackImage } from '@/ui/fallback-image';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu, type TableActionItem } from '@/ui/table-actions-menu';
import { TableStateMessage } from '@/ui/table-state-message';

type ProductsTableProps = {
  items: Product[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isColumnVisible: (id: string) => boolean;
  visibleColumnCount: number;
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
  search: string;
  getActionItems: (product: Product) => TableActionItem[];
  sortBy:
    | 'id'
    | 'name'
    | 'brand'
    | 'category'
    | 'subCategory'
    | 'grade'
    | 'warranty'
    | 'featured'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | undefined;
  sortDir: SortDirection | undefined;
  onSortChange: (nextSortBy?: string, nextSortDir?: SortDirection) => void;
};

export function ProductsTable({
  items,
  isLoading,
  isError,
  onRetry,
  isColumnVisible,
  visibleColumnCount,
  expandedRows,
  onToggleRow,
  search,
  getActionItems,
  sortBy,
  sortDir,
  onSortChange,
}: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isColumnVisible('id') && (
            <TableHead>
              <SortableTableHead
                label="ID"
                columnKey="id"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('name') && (
            <TableHead>
              <SortableTableHead
                label="Name"
                columnKey="name"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('brand') && (
            <TableHead>
              <SortableTableHead
                label="Brand"
                columnKey="brand"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('category') && (
            <TableHead>
              <SortableTableHead
                label="Category"
                columnKey="category"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('subCategory') && (
            <TableHead>
              <SortableTableHead
                label="Sub Category"
                columnKey="subCategory"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('grade') && (
            <TableHead>
              <SortableTableHead
                label="Grade"
                columnKey="grade"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('warranty') && (
            <TableHead>
              <SortableTableHead
                label="Warranty"
                columnKey="warranty"
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={onSortChange}
              />
            </TableHead>
          )}
          {isColumnVisible('featured') && (
            <TableHead>
              <SortableTableHead
                label="Featured"
                columnKey="featured"
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
          {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {isColumnVisible('id') && (
                <TableCell>
                  <Skeleton className="h-5 w-8" />
                </TableCell>
              )}
              {isColumnVisible('name') && (
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                </TableCell>
              )}
              {isColumnVisible('brand') && (
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              )}
              {isColumnVisible('category') && (
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              )}
              {isColumnVisible('subCategory') && (
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              )}
              {isColumnVisible('grade') && (
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              )}
              {isColumnVisible('warranty') && (
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
              )}
              {isColumnVisible('featured') && (
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell>
                  <Skeleton className="h-5 w-16" />
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
                message="Failed to load products. Please try again."
                onRetry={onRetry}
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
                message="No products found. Add one to get started."
              />
            </TableCell>
          </TableRow>
        ) : (
          items.map(product => (
            <TableRow
              key={product.id}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onToggleRow(product.id)}
            >
              {isColumnVisible('id') && <TableCell>{product.id}</TableCell>}
              {isColumnVisible('name') && (
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="border-border/60 bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                      <FallbackImage
                        src={product.imagePath ?? product.images?.[0]}
                        fallbackSrc={IMAGE_PLACEHOLDERS.productSquare}
                        alt={product.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          expandedRows.has(product.id) || search
                            ? 'whitespace-normal'
                            : 'max-w-75 truncate',
                        )}
                        title={product.name}
                      >
                        {product.name}
                      </div>
                      <div
                        className={cn(
                          'text-muted-foreground text-xs',
                          expandedRows.has(product.id) || search
                            ? 'whitespace-normal'
                            : 'max-w-75 truncate',
                        )}
                        title={product.slug}
                      >
                        {product.slug}
                      </div>
                    </div>
                  </div>
                </TableCell>
              )}
              {isColumnVisible('brand') && <TableCell>{product.brandName || '-'}</TableCell>}
              {isColumnVisible('category') && <TableCell>{product.categoryName || '-'}</TableCell>}
              {isColumnVisible('subCategory') && (
                <TableCell>{product.subCategoryName || '-'}</TableCell>
              )}
              {isColumnVisible('grade') && (
                <TableCell>
                  {product.gradeName || (product.gradeId ? product.gradeId.toString() : '-')}
                </TableCell>
              )}
              {isColumnVisible('warranty') && <TableCell>{product.warrantyName || '-'}</TableCell>}
              {isColumnVisible('featured') && (
                <TableCell>
                  {product.isFeatured ? (
                    <StatusBadge variant="featured">Featured</StatusBadge>
                  ) : (
                    <StatusBadge variant="neutral">No</StatusBadge>
                  )}
                </TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell>
                  <StatusBadge variant={product.status === 'active' ? 'success' : 'neutral'}>
                    {product.status}
                  </StatusBadge>
                </TableCell>
              )}
              {isColumnVisible('actions') && (
                <TableCell>
                  <TableActionsMenu
                    items={getActionItems(product)}
                    onTriggerClick={event => event.stopPropagation()}
                  />
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
