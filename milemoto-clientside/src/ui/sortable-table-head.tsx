'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

type SortableTableHeadProps = {
  label: string;
  columnKey: string;
  sortBy?: string | undefined;
  sortDir?: SortDirection | undefined;
  onSortChange: (sortBy?: string | undefined, sortDir?: SortDirection | undefined) => void;
  className?: string;
};

export function SortableTableHead({
  label,
  columnKey,
  sortBy,
  sortDir,
  onSortChange,
  className,
}: SortableTableHeadProps) {
  const isActive = sortBy === columnKey;

  const nextSort = () => {
    if (!isActive) {
      onSortChange(columnKey, 'asc');
      return;
    }

    if (sortDir === 'asc') {
      onSortChange(columnKey, 'desc');
      return;
    }

    onSortChange(undefined, undefined);
  };

  return (
    <button
      type="button"
      className={cn(
        'hover:bg-muted/50 focus-visible:ring-ring -mx-2 inline-flex h-10 w-[calc(100%+1rem)] items-center justify-start gap-1 border-0 bg-transparent px-2 text-left font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
        className,
      )}
      onClick={nextSort}
      aria-label={`Sort by ${label}`}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      {isActive ? (
        sortDir === 'desc' ? (
          <ArrowDown className="ml-1 h-4 w-4" />
        ) : (
          <ArrowUp className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="text-muted-foreground ml-1 h-4 w-4" />
      )}
    </button>
  );
}
