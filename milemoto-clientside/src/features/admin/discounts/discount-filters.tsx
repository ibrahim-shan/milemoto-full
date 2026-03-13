'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type DiscountFilterValue = string | number | boolean | string[] | undefined;

type DiscountFiltersProps = {
  filters: Record<string, DiscountFilterValue>;
  onFilterChange: (nextFilters: Record<string, DiscountFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function DiscountFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: DiscountFiltersProps) {
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
        { label: 'Fixed', value: 'fixed' },
        { label: 'Percentage', value: 'percentage' },
      ],
    },
    {
      key: 'createdRange',
      label: 'Created Date',
      type: 'date-range',
      startKey: 'dateFrom',
      endKey: 'dateTo',
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
            aria-label="Search coupon code"
            placeholder="Search coupon code..."
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
