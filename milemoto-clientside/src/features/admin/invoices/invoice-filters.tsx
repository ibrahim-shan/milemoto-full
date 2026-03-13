'use client';

import type { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { GenericFilter, type FilterConfig } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type InvoiceFiltersProps = {
  filters: Record<string, string | number | boolean | string[] | undefined>;
  onFilterChange: (
    next: Record<string, string | number | boolean | string[] | undefined>,
  ) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

const FILTER_CONFIG: FilterConfig[] = [
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
      { label: 'Issued', value: 'issued' },
      { label: 'Paid', value: 'paid' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Void', value: 'void' },
    ],
  },
  {
    key: 'issueDateRange',
    label: 'Issue Date',
    type: 'date-range',
    startKey: 'dateFrom',
    endKey: 'dateTo',
  },
];

export function InvoiceFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: InvoiceFiltersProps) {
  return (
    <GenericFilter
      config={FILTER_CONFIG}
      filters={filters}
      onFilterChange={onFilterChange}
      search={
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search invoice #, order #, customer, phone..."
            className="pl-9"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      }
      actions={actions}
    />
  );
}
