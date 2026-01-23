import { Plus, Search } from 'lucide-react';

import { Button } from '@/ui/button';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { Input } from '@/ui/input';

type ColumnItem = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

type PurchaseOrdersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  columns: ReadonlyArray<ColumnItem>;
  columnVisibility: Record<string, boolean>;
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onAdd: () => void;
};

export function PurchaseOrdersToolbar({
  search,
  onSearchChange,
  columns,
  columnVisibility,
  onToggleColumn,
  onAdd,
}: PurchaseOrdersToolbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="relative max-w-sm flex-1">
        <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          placeholder="Search purchase orders..."
          className="pl-9"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

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
    </div>
  );
}
