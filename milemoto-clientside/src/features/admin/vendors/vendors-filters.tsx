'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type FilterValue = string | number | string[] | boolean | undefined;

type VendorsFiltersProps = {
  filters: Record<string, FilterValue>;
  onFilterChange: (next: Record<string, FilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  locationOptions: Array<{ label: string; value: string }>;
  actions?: ReactNode;
};

export function VendorsFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  locationOptions,
  actions,
}: VendorsFiltersProps) {
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
    {
      key: 'country',
      label: 'Location',
      type: 'multiselect',
      options: locationOptions,
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
            placeholder="Search vendors..."
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
