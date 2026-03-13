'use client';

import { ReactNode } from 'react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type FilterValue = string | number | boolean | string[] | undefined;

type LocationsFiltersProps = {
  filters: Record<string, FilterValue>;
  onFilterChange: (next: Record<string, FilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function LocationsFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: LocationsFiltersProps) {
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
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Warehouse', value: 'Warehouse' },
        { label: 'Store', value: 'Store' },
        { label: 'Office', value: 'Office' },
        { label: 'Factory', value: 'Factory' },
        { label: 'Others', value: 'Others' },
      ],
    },
  ];

  return (
    <GenericFilter
      config={filterConfig}
      filters={filters}
      onFilterChange={onFilterChange}
      search={
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search locations..."
            aria-label="Search stock locations"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
          />
        </div>
      }
      actions={actions}
    />
  );
}
