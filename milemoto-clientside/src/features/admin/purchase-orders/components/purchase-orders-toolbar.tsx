import { Plus, Search } from 'lucide-react';

import { Button } from '@/ui/button';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type ColumnItem = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

type PurchaseOrdersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Record<string, string | number | boolean | string[] | undefined>;
  onFiltersChange: (
    nextFilters: Record<string, string | number | boolean | string[] | undefined>,
  ) => void;
  vendorOptions: Array<{ label: string; value: string }>;
  paymentMethodOptions: Array<{ label: string; value: string }>;
  columns: ReadonlyArray<ColumnItem>;
  columnVisibility: Record<string, boolean>;
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onAdd: () => void;
};

export function PurchaseOrdersToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  vendorOptions,
  paymentMethodOptions,
  columns,
  columnVisibility,
  onToggleColumn,
  onAdd,
}: PurchaseOrdersToolbarProps) {
  const filterConfig: FilterConfig[] = [
    {
      key: 'filterMode',
      label: 'Match',
      type: 'select',
      options: [
        { label: 'All selected filters', value: 'all' },
        { label: 'Any selected filter', value: 'any' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Approval', value: 'pending_approval' },
        { label: 'Approved', value: 'approved' },
        { label: 'Partially Received', value: 'partially_received' },
        { label: 'Fully Received', value: 'fully_received' },
        { label: 'Closed', value: 'closed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      key: 'vendorId',
      label: 'Vendor',
      type: 'select',
      options: vendorOptions,
    },
    {
      key: 'paymentMethodId',
      label: 'Payment Method',
      type: 'select',
      options: paymentMethodOptions,
    },
    {
      key: 'dateRange',
      label: 'Created Date',
      type: 'date-range',
      startKey: 'dateFrom',
      endKey: 'dateTo',
    },
  ];

  return (
    <div className="mb-6">
      <GenericFilter
        config={filterConfig}
        filters={filters}
        onFilterChange={onFiltersChange}
        search={
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search purchase orders..."
              className="pl-9"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <ColumnVisibilityMenu
              columns={columns}
              visibility={columnVisibility}
              onToggle={onToggleColumn}
            />
            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={onAdd}
            >
              Add Purchase Order
            </Button>
          </div>
        }
      />
    </div>
  );
}
