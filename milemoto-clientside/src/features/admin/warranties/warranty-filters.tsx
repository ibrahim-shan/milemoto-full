'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type WarrantyFilterValue = string | number | boolean | string[] | undefined;

type WarrantyFiltersProps = {
  filters: Record<string, WarrantyFilterValue>;
  onFilterChange: (nextFilters: Record<string, WarrantyFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function WarrantyFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: WarrantyFiltersProps) {
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
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return (
    <GenericFilter
      config={filterConfig}
      filters={filters}
      onFilterChange={onFilterChange}
      search={
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            aria-label="Search warranties"
            placeholder="Search warranties..."
            className="pl-9"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
          />
        </div>
      }
      actions={actions}
    />
  );
}
