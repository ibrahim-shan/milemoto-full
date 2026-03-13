'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type CustomerFilterValue = string | number | boolean | string[] | undefined;

type CustomerFiltersProps = {
  filters: Record<string, CustomerFilterValue>;
  onFilterChange: (nextFilters: Record<string, CustomerFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function CustomerFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: CustomerFiltersProps) {
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
        { label: 'Blocked', value: 'blocked' },
      ],
    },
    {
      key: 'orders',
      label: 'Orders',
      type: 'range',
      minKey: 'ordersMin',
      maxKey: 'ordersMax',
    },
    {
      key: 'spent',
      label: 'Total Spent',
      type: 'range',
      minKey: 'spentMin',
      maxKey: 'spentMax',
    },
    {
      key: 'date',
      label: 'Registration Date',
      type: 'date-range',
      startKey: 'dateStart',
      endKey: 'dateEnd',
      fullWidth: true,
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
            aria-label="Search customers"
            placeholder="Search customers..."
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
