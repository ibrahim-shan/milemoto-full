import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

type ColumnVisibilityItem = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

type ColumnVisibilityMenuProps = {
  columns: ReadonlyArray<ColumnVisibilityItem>;
  visibility: Record<string, boolean>;
  onToggle: (columnId: string, visible: boolean) => void;
  label?: string;
};

export function ColumnVisibilityMenu({
  columns,
  visibility,
  onToggle,
  label = 'Columns',
}: ColumnVisibilityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => {
          const checked = column.alwaysVisible ? true : visibility[column.id] !== false;
          return (
            <DropdownMenuItem
              key={column.id}
              onSelect={event => event.preventDefault()}
              className="gap-2"
            >
              <Checkbox
                checked={checked}
                aria-label={`Toggle ${column.label} column`}
                onCheckedChange={value => {
                  if (column.alwaysVisible) return;
                  onToggle(column.id, value === true);
                }}
                disabled={column.alwaysVisible}
              />
              <span>{column.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
