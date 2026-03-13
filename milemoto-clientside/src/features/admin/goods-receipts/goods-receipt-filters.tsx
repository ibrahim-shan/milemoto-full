'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type GoodsReceiptFilterValue = string | number | boolean | string[] | undefined;

type GoodsReceiptFiltersProps = {
  filters: Record<string, GoodsReceiptFilterValue>;
  onFilterChange: (nextFilters: Record<string, GoodsReceiptFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function GoodsReceiptFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: GoodsReceiptFiltersProps) {
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
        { label: 'Posted', value: 'posted' },
      ],
    },
    {
      key: 'receivedAtRange',
      label: 'Received Date',
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
            aria-label="Search goods receipts"
            placeholder="Search goods receipts..."
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
