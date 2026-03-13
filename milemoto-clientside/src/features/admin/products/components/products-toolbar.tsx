import { Plus, Search } from 'lucide-react';

import { Button } from '@/ui/button';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { GenericFilter, type FilterConfig } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type ColumnItem = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

type ProductsToolbarProps = {
  filterConfig: FilterConfig[];
  filters: Record<string, string | number | boolean | string[] | undefined>;
  onFiltersChange: (
    filters: Record<string, string | number | boolean | string[] | undefined>,
  ) => void;
  search: string;
  onSearchChange: (value: string) => void;
  columns: ReadonlyArray<ColumnItem>;
  columnVisibility: Record<string, boolean>;
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onAdd: () => void;
};

export function ProductsToolbar({
  filterConfig,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  columns,
  columnVisibility,
  onToggleColumn,
  onAdd,
}: ProductsToolbarProps) {
  return (
    <div className="mb-6">
      <GenericFilter
        config={filterConfig}
        filters={filters}
        onFilterChange={onFiltersChange}
        search={
          <div className="relative max-w-sm">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search products..."
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
              Add Product
            </Button>
          </div>
        }
      />
    </div>
  );
}
