'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type OrderRequestFilterValue = string | number | boolean | string[] | undefined;

type OrderRequestFiltersProps = {
  filters: Record<string, OrderRequestFilterValue>;
  onFilterChange: (nextFilters: Record<string, OrderRequestFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

const TYPE_OPTIONS = [
  { value: 'cancel', label: 'Cancellation' },
  { value: 'return', label: 'Return' },
  { value: 'refund', label: 'Refund' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled_by_user', label: 'Cancelled By User' },
];

export function OrderRequestFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: OrderRequestFiltersProps) {
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
      key: 'type',
      label: 'Type',
      type: 'select',
      options: TYPE_OPTIONS,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    {
      key: 'onlyRequiresStockAction',
      label: 'Requires Stock Action',
      type: 'boolean',
    },
    {
      key: 'onlyRefundPendingCompletion',
      label: 'Refund Pending Completion',
      type: 'boolean',
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
            placeholder="Search by order #, customer, phone"
            aria-label="Search order requests"
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
