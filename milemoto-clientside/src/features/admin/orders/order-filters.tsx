'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type OrderFilterValue = string | number | boolean | string[] | undefined;

type OrderFiltersProps = {
  filters: Record<string, OrderFilterValue>;
  onFilterChange: (nextFilters: Record<string, OrderFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  paymentMethodOptions: Array<{ label: string; value: string }>;
  actions?: ReactNode;
};

const STATUS_OPTIONS = [
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
];

export function OrderFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  paymentMethodOptions,
  actions,
}: OrderFiltersProps) {
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
      options: STATUS_OPTIONS,
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      type: 'select',
      options: PAYMENT_STATUS_OPTIONS,
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      type: 'select',
      options: paymentMethodOptions,
    },
    {
      key: 'placedDateRange',
      label: 'Placed Date',
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
            aria-label="Search orders"
            placeholder="Search by order #, customer, phone"
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
