'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';

import { Search } from 'lucide-react';

import { useGetStockFilterOptions } from '@/hooks/useStockQueries';
import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

type StockFilterValue = string | number | boolean | string[] | undefined;

type StockFiltersProps = {
  filters: Record<string, StockFilterValue>;
  onFilterChange: (nextFilters: Record<string, StockFilterValue>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
};

export function StockFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  actions,
}: StockFiltersProps) {
  const { data: filterOptionsData } = useGetStockFilterOptions();
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const selectedCategoryId =
    typeof draftFilters.categoryId === 'string' && draftFilters.categoryId.length > 0
      ? Number(draftFilters.categoryId)
      : null;

  const subcategoryOptions = useMemo(() => {
    if (!filterOptionsData?.subcategories) return [];
    if (selectedCategoryId === null) return [];

    return filterOptionsData.subcategories
      .filter(subcategory => subcategory.parentId === selectedCategoryId)
      .map(subcategory => ({
        label: subcategory.name,
        value: String(subcategory.id),
      }));
  }, [filterOptionsData?.subcategories, selectedCategoryId]);

  useEffect(() => {
    const selectedSubCategoryId =
      typeof draftFilters.subCategoryId === 'string' && draftFilters.subCategoryId.length > 0
        ? Number(draftFilters.subCategoryId)
        : null;

    if (selectedSubCategoryId === null) return;

    const isValidSelection = filterOptionsData?.subcategories?.some(
      subcategory =>
        subcategory.id === selectedSubCategoryId &&
        (selectedCategoryId === null || subcategory.parentId === selectedCategoryId),
    );

    if (!isValidSelection) {
      setDraftFilters(prev => ({ ...prev, subCategoryId: '' }));
    }
  }, [draftFilters.subCategoryId, filterOptionsData?.subcategories, selectedCategoryId]);

  const filterConfig: FilterConfig[] = [
    {
      key: 'brandId',
      label: 'Brand',
      type: 'select',
      options: (filterOptionsData?.brands ?? []).map(brand => ({
        label: brand.name,
        value: String(brand.id),
      })),
    },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'select',
      options: (filterOptionsData?.categories ?? []).map(category => ({
        label: category.name,
        value: String(category.id),
      })),
    },
    {
      key: 'subCategoryId',
      label: 'Subcategory',
      type: 'select',
      placeholder: selectedCategoryId === null ? 'Select category first' : 'Select Subcategory...',
      options: subcategoryOptions,
    },
    {
      key: 'stockLocationId',
      label: 'Location',
      type: 'select',
      options: (filterOptionsData?.locations ?? []).map(location => ({
        label: `#${location.id} ${location.name}`,
        value: String(location.id),
      })),
    },
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
      key: 'lowStockOnly',
      label: 'Low Stock',
      type: 'boolean',
    },
    {
      key: 'outOfStockOnly',
      label: 'Out of Stock',
      type: 'boolean',
    },
    {
      key: 'allocatedOnly',
      label: 'Allocated',
      type: 'boolean',
    },
    {
      key: 'onOrderOnly',
      label: 'On Order',
      type: 'boolean',
    },
  ];

  return (
    <GenericFilter
      config={filterConfig}
      filters={filters}
      draftFilters={draftFilters}
      onDraftFiltersChange={setDraftFilters}
      onFilterChange={onFilterChange}
      search={
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            aria-label="Search stock levels"
            placeholder="Search by SKU, product, or location..."
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
