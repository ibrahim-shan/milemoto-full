'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type CategoryFilterValue = string | number | boolean | string[] | undefined;

type CategoryFiltersProps = {
  filters: Record<string, CategoryFilterValue>;
  onFilterChange: (nextFilters: Record<string, CategoryFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  parentOptions: { label: string; value: string }[];
  actions?: ReactNode;
};

export function CategoryFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  parentOptions,
  actions,
}: CategoryFiltersProps) {
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
      key: 'parentIds',
      label: 'Parent Category',
      type: 'multiselect',
      options: parentOptions,
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
            aria-label="Search categories"
            placeholder="Search categories..."
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
