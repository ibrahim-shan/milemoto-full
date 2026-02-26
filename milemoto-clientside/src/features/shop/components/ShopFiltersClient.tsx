// src/app/shop/ShopFiltersClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ProductsGrid } from '@/features/shop/components/ProductsGrid';
import { ShopFilters, type FilterState } from '@/features/shop/components/ShopFilters';
import { fetchFilters, fetchProducts } from '@/lib/storefront';
import type { StorefrontFiltersResponse, StorefrontProductListItem } from '@/types';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'title-asc';

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const btnId = 'sort-trigger';
  const menuId = 'sort-menu';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
        const items = Array.from(
          document.querySelectorAll<HTMLButtonElement>(`#${menuId} [role="menuitemradio"]`),
        );
        items.at(0)?.focus();
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const opts: [SortKey, string][] = [
    ['default', 'Default'],
    ['price-asc', 'Price: Low to High'],
    ['price-desc', 'Price: High to Low'],
    ['title-asc', 'Title: A–Z'],
  ];
  const label = opts.find(o => o[0] === value)?.[1] ?? 'Default';

  return (
    <div
      className="relative"
      ref={ref}
    >
      <button
        id={btnId}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Open sort options"
        className="border-border bg-background text-foreground hover:bg-muted/50 hover:dark:bg-card inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm focus:outline-none"
      >
        <span className="text-foreground/70">Sort</span>
        <span className="font-medium">{label}</span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-labelledby={btnId}
        aria-orientation="vertical"
        className={`${
          open ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
        } border-border/60 bg-card absolute right-0 z-50 mt-2 w-56 rounded-md border p-1 shadow-xl outline-none transition-all duration-150`}
      >
        {opts.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="menuitemradio"
            aria-checked={value === key}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onChange(key);
              setOpen(false);
            }}
            className="text-foreground/80 hover:bg-muted/60 hover:text-foreground block w-full rounded-[8px] px-3 py-2 text-left text-sm transition-colors"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const SORT_MAP: Record<SortKey, 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | undefined> = {
  default: undefined,
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
  'title-asc': 'name-asc',
};

const PAGE_SIZE = 12;
const EMPTY_FILTER_STATE: FilterState = {
  categoryIds: [],
  subCategoryIds: [],
  brandIds: [],
  gradeIds: [],
};

type ShopUrlState = {
  q: string;
  sort: SortKey;
  filterState: FilterState;
  page: number;
};

function parseIntList(values: string[]): number[] {
  return values.map(v => Number(v)).filter(n => Number.isInteger(n) && n > 0);
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseSort(value: string | null): SortKey {
  if (value === 'price-asc' || value === 'price-desc' || value === 'title-asc') return value;
  // Backward/alternate mapping if URL uses API sort key directly.
  if (value === 'name-asc') return 'title-asc';
  return 'default';
}

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function parseShopUrlState(searchParams: URLSearchParams): ShopUrlState {
  const minPrice = parseOptionalNumber(searchParams.get('minPrice'));
  const maxPrice = parseOptionalNumber(searchParams.get('maxPrice'));

  return {
    q: searchParams.get('search') ?? '',
    sort: parseSort(searchParams.get('sort')),
    page: parsePage(searchParams.get('page')),
    filterState: {
      categoryIds: parseIntList(searchParams.getAll('categoryId')),
      subCategoryIds: parseIntList(searchParams.getAll('subCategoryId')),
      brandIds: parseIntList(searchParams.getAll('brandId')),
      gradeIds: parseIntList(searchParams.getAll('gradeId')),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    },
  };
}

function sortNums(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function filterStateEqual(a: FilterState, b: FilterState): boolean {
  const sameArrays =
    JSON.stringify(sortNums(a.categoryIds)) === JSON.stringify(sortNums(b.categoryIds)) &&
    JSON.stringify(sortNums(a.subCategoryIds)) === JSON.stringify(sortNums(b.subCategoryIds)) &&
    JSON.stringify(sortNums(a.brandIds)) === JSON.stringify(sortNums(b.brandIds)) &&
    JSON.stringify(sortNums(a.gradeIds)) === JSON.stringify(sortNums(b.gradeIds));

  return sameArrays && a.minPrice === b.minPrice && a.maxPrice === b.maxPrice;
}

export function ShopFiltersClient() {
  const latestProductsRequestId = useRef(0);
  const productsAbortControllerRef = useRef<AbortController | null>(null);
  const appendNextPageRef = useRef(false);
  const prevQueryKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialUrlState = parseShopUrlState(new URLSearchParams(searchParams.toString()));
  const [q, setQ] = useState(initialUrlState.q);
  const [sort, setSort] = useState<SortKey>(initialUrlState.sort);
  const [filterState, setFilterState] = useState<FilterState>(initialUrlState.filterState);

  // Data state
  const [products, setProducts] = useState<StorefrontProductListItem[]>([]);
  const [filtersData, setFiltersData] = useState<StorefrontFiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [page, setPage] = useState(initialUrlState.page);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(initialUrlState.q);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Sync local state from URL (supports back/forward navigation)
  useEffect(() => {
    const next = parseShopUrlState(new URLSearchParams(searchParams.toString()));

    setQ(prev => (prev === next.q ? prev : next.q));
    setSort(prev => (prev === next.sort ? prev : next.sort));
    setFilterState(prev => (filterStateEqual(prev, next.filterState) ? prev : next.filterState));
    setPage(prev => (prev === next.page ? prev : next.page));
  }, [searchParams]);

  // Sync URL from local state (search/sort/filters only)
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value?: string) => {
      if (value == null || value === '') nextParams.delete(key);
      else nextParams.set(key, value);
    };

    nextParams.delete('categoryId');
    nextParams.delete('subCategoryId');
    nextParams.delete('brandId');
    nextParams.delete('gradeId');
    setOrDelete('search', debouncedSearch.trim() || undefined);
    setOrDelete('sort', sort !== 'default' ? sort : undefined);
    setOrDelete(
      'minPrice',
      filterState.minPrice !== undefined ? String(filterState.minPrice) : undefined,
    );
    setOrDelete(
      'maxPrice',
      filterState.maxPrice !== undefined ? String(filterState.maxPrice) : undefined,
    );

    for (const id of sortNums(filterState.categoryIds)) nextParams.append('categoryId', String(id));
    for (const id of sortNums(filterState.subCategoryIds))
      nextParams.append('subCategoryId', String(id));
    for (const id of sortNums(filterState.brandIds)) nextParams.append('brandId', String(id));
    for (const id of sortNums(filterState.gradeIds)) nextParams.append('gradeId', String(id));
    setOrDelete('page', page > 1 ? String(page) : undefined);

    const current = searchParams.toString();
    const nextQuery = nextParams.toString();
    if (nextQuery !== current) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [router, pathname, searchParams, debouncedSearch, sort, filterState, page]);

  const queryKey = JSON.stringify({
    search: debouncedSearch.trim(),
    sort,
    categoryIds: sortNums(filterState.categoryIds),
    subCategoryIds: sortNums(filterState.subCategoryIds),
    brandIds: sortNums(filterState.brandIds),
    gradeIds: sortNums(filterState.gradeIds),
    minPrice: filterState.minPrice,
    maxPrice: filterState.maxPrice,
  });

  const hasActiveFilters =
    filterState.categoryIds.length > 0 ||
    filterState.subCategoryIds.length > 0 ||
    filterState.brandIds.length > 0 ||
    filterState.gradeIds.length > 0 ||
    filterState.minPrice !== undefined ||
    filterState.maxPrice !== undefined;
  const hasAnyActiveControls =
    q.trim().length > 0 || sort !== 'default' || hasActiveFilters || page > 1;

  const filterLabelMaps = useMemo(() => {
    const categories = new Map<number, string>();
    const subCategories = new Map<number, string>();
    const brands = new Map<number, string>();
    const grades = new Map<number, string>();

    if (filtersData) {
      for (const c of filtersData.categories) {
        categories.set(c.id, c.name);
        for (const s of c.subCategories) subCategories.set(s.id, s.name);
      }
      for (const b of filtersData.brands) brands.set(b.id, b.name);
      for (const g of filtersData.grades) grades.set(g.id, g.name);
    }

    return { categories, subCategories, brands, grades };
  }, [filtersData]);

  const removeFilterId = useCallback(
    (key: 'categoryIds' | 'subCategoryIds' | 'brandIds' | 'gradeIds', id: number) => {
      setFilterState(prev => ({ ...prev, [key]: prev[key].filter(x => x !== id) }));
    },
    [],
  );

  const clearPriceFilter = useCallback(() => {
    setFilterState(prev => {
      const { minPrice: _min, maxPrice: _max, ...rest } = prev;
      void _min;
      void _max;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState(EMPTY_FILTER_STATE);
  }, []);

  const resetAllControls = useCallback(() => {
    setQ('');
    setDebouncedSearch('');
    setSort('default');
    setFilterState(EMPTY_FILTER_STATE);
    appendNextPageRef.current = false;
    setPage(1);
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    for (const id of filterState.categoryIds) {
      chips.push({
        key: `cat-${id}`,
        label: `Category: ${filterLabelMaps.categories.get(id) ?? `#${id}`}`,
        onRemove: () => removeFilterId('categoryIds', id),
      });
    }
    for (const id of filterState.subCategoryIds) {
      chips.push({
        key: `sub-${id}`,
        label: `Subcategory: ${filterLabelMaps.subCategories.get(id) ?? `#${id}`}`,
        onRemove: () => removeFilterId('subCategoryIds', id),
      });
    }
    for (const id of filterState.brandIds) {
      chips.push({
        key: `brand-${id}`,
        label: `Brand: ${filterLabelMaps.brands.get(id) ?? `#${id}`}`,
        onRemove: () => removeFilterId('brandIds', id),
      });
    }
    for (const id of filterState.gradeIds) {
      chips.push({
        key: `grade-${id}`,
        label: `Grade: ${filterLabelMaps.grades.get(id) ?? `#${id}`}`,
        onRemove: () => removeFilterId('gradeIds', id),
      });
    }

    if (filterState.minPrice !== undefined || filterState.maxPrice !== undefined) {
      chips.push({
        key: 'price-range',
        label: `Price: $${filterState.minPrice ?? 0} - $${filterState.maxPrice ?? 'max'}`,
        onRemove: clearPriceFilter,
      });
    }

    return chips;
  }, [filterState, filterLabelMaps, removeFilterId, clearPriceFilter]);

  useEffect(
    () => () => {
      productsAbortControllerRef.current?.abort();
    },
    [],
  );

  // Fetch filters on mount
  useEffect(() => {
    let cancelled = false;
    setFiltersLoading(true);
    fetchFilters()
      .then(data => {
        if (!cancelled) setFiltersData(data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load filters');
      })
      .finally(() => {
        if (!cancelled) setFiltersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildProductsQuery = useCallback(
    (pageNum: number) => ({
      page: pageNum,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sort: SORT_MAP[sort],
      categoryId: filterState.categoryIds.length > 0 ? filterState.categoryIds : undefined,
      subCategoryId: filterState.subCategoryIds.length > 0 ? filterState.subCategoryIds : undefined,
      brandId: filterState.brandIds.length > 0 ? filterState.brandIds : undefined,
      gradeId: filterState.gradeIds.length > 0 ? filterState.gradeIds : undefined,
      minPrice: filterState.minPrice,
      maxPrice: filterState.maxPrice,
    }),
    [debouncedSearch, sort, filterState],
  );

  const beginProductsRequest = useCallback(() => {
    productsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    productsAbortControllerRef.current = controller;
    return controller;
  }, []);

  // Fetch products for a single page (replace or append)
  const loadProducts = useCallback(
    async (pageNum: number, append = false) => {
      const controller = beginProductsRequest();
      const requestId = ++latestProductsRequestId.current;
      setLoading(true);
      try {
        const result = await fetchProducts(buildProductsQuery(pageNum), {
          signal: controller.signal,
        });
        if (requestId !== latestProductsRequestId.current) return;
        setProducts(prev => (append ? [...prev, ...result.items] : result.items));
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch {
        if (controller.signal.aborted) return;
        if (requestId !== latestProductsRequestId.current) return;
        toast.error('Failed to load products');
      } finally {
        if (productsAbortControllerRef.current === controller) {
          productsAbortControllerRef.current = null;
        }
        if (controller.signal.aborted) return;
        if (requestId !== latestProductsRequestId.current) return;
        setLoading(false);
      }
    },
    [beginProductsRequest, buildProductsQuery],
  );

  const loadProductsUpToPage = useCallback(
    async (targetPage: number) => {
      const controller = beginProductsRequest();
      const requestId = ++latestProductsRequestId.current;
      setLoading(true);
      try {
        let combined: StorefrontProductListItem[] = [];
        let lastTotalPages = 1;
        let lastTotalCount = 0;

        for (let p = 1; p <= targetPage; p++) {
          const result = await fetchProducts(buildProductsQuery(p), {
            signal: controller.signal,
          });
          if (requestId !== latestProductsRequestId.current) return;
          combined = p === 1 ? result.items : [...combined, ...result.items];
          lastTotalPages = result.totalPages;
          lastTotalCount = result.totalCount;
        }

        setProducts(combined);
        setTotalPages(lastTotalPages);
        setTotalCount(lastTotalCount);
      } catch {
        if (controller.signal.aborted) return;
        if (requestId !== latestProductsRequestId.current) return;
        toast.error('Failed to load products');
      } finally {
        if (productsAbortControllerRef.current === controller) {
          productsAbortControllerRef.current = null;
        }
        if (controller.signal.aborted) return;
        if (requestId !== latestProductsRequestId.current) return;
        setLoading(false);
      }
    },
    [beginProductsRequest, buildProductsQuery],
  );

  // Drive fetching from query/page state and support append for "Load More".
  useEffect(() => {
    const prevQueryKey = prevQueryKeyRef.current;
    const queryChanged = prevQueryKey !== null && prevQueryKey !== queryKey;
    prevQueryKeyRef.current = queryKey;

    if (queryChanged && page !== 1) {
      appendNextPageRef.current = false;
      setPage(1);
      return;
    }

    const append = appendNextPageRef.current && page > 1 && !queryChanged;
    appendNextPageRef.current = false;
    if (!append && page > 1) {
      void loadProductsUpToPage(page);
      return;
    }
    void loadProducts(page, append);
  }, [loadProducts, loadProductsUpToPage, page, queryKey]);

  const loadMore = () => {
    const next = page + 1;
    appendNextPageRef.current = true;
    setPage(next);
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
      <aside
        aria-labelledby="filters-heading"
        className="h-fit md:sticky md:top-24"
      >
        <h2
          id="filters-heading"
          className="sr-only"
        >
          Shop filters
        </h2>
        <ShopFilters
          filters={filtersData}
          loading={filtersLoading}
          value={filterState}
          onChange={setFilterState}
        />
      </aside>

      <div className="min-w-0">
        {/* top bar: search + sort */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <label
              htmlFor="product-search-input"
              className="sr-only"
            >
              Search products
            </label>
            <Search
              aria-hidden
              className="text-foreground/50 pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            />
            <Input
              id="product-search-input"
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search products by name"
              className="border-border bg-background text-foreground focus:border-primary w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none"
            />
          </div>

          {/* Sort + Count */}
          <div className="flex w-full items-center gap-3 sm:w-auto">
            {!loading && (
              <span className="text-foreground/60 whitespace-nowrap text-sm">
                {totalCount} product{totalCount !== 1 ? 's' : ''}
              </span>
            )}
            {hasAnyActiveControls && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllControls}
                className="whitespace-nowrap"
              >
                Reset all
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="whitespace-nowrap"
              >
                Clear all filters
              </Button>
            )}
            <SortMenu
              value={sort}
              onChange={setSort}
            />
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeFilterChips.map(chip => (
              <Button
                key={chip.key}
                variant="subtle"
                size="sm"
                onClick={chip.onRemove}
                className="max-w-full"
                title={`Remove ${chip.label}`}
              >
                <span className="truncate">{chip.label}</span>
                <span
                  aria-hidden
                  className="ml-1"
                >
                  ×
                </span>
              </Button>
            ))}
          </div>
        )}

        <ProductsGrid
          products={products}
          loading={loading && page === 1}
          cardVariant="inline"
        />

        {/* Load More */}
        {page < totalPages && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              size="md"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
