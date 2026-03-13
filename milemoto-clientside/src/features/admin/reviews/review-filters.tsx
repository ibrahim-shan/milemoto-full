'use client';

import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type ReviewFilterValue = string | number | boolean | string[] | undefined;

type ReviewFiltersProps = {
  filters: Record<string, ReviewFilterValue>;
  onFilterChange: (nextFilters: Record<string, ReviewFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function ReviewFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: ReviewFiltersProps) {
  const filterConfig: FilterConfig[] = [
    {
      key: 'filterMode',
      label: 'Match',
      type: 'select',
      options: [
        { value: 'all', label: 'All selected filters' },
        { value: 'any', label: 'Any selected filter' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'deleted_by_user', label: 'Deleted By User' },
      ],
    },
    {
      key: 'ratingMin',
      label: 'Minimum Rating',
      type: 'select',
      options: [
        { value: '5', label: '5 stars only' },
        { value: '4', label: '4 stars & up' },
        { value: '3', label: '3 stars & up' },
        { value: '2', label: '2 stars & up' },
        { value: '1', label: '1 star & up' },
      ],
    },
    {
      key: 'changes',
      label: 'Changes',
      type: 'select',
      options: [
        { value: 'edited', label: 'Edited only' },
        { value: 'never_edited', label: 'Never edited' },
      ],
    },
    {
      key: 'productId',
      label: 'Product ID',
      type: 'text',
      placeholder: 'Enter product ID',
    },
    {
      key: 'suspiciousOnly',
      label: 'Suspicious only',
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
            aria-label="Search reviews"
            placeholder="Search by product, author"
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
