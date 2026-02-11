// src/app/shop/ShopFiltersClient.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useCart } from '@/features/cart/cart-context';
import { ProductsGrid, type ProductGridItem } from '@/features/shop/components/ProductsGrid';
import { ShopFilters, type FilterState } from '@/features/shop/components/ShopFilters';
import { fetchProducts, fetchFilters } from '@/lib/storefront';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';

import type { StorefrontFiltersResponse, StorefrontProductListItem } from '@/types';

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
        className={`${open ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
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

const EMPTY_FILTERS: FilterState = {
  categoryIds: [],
  subCategoryIds: [],
  brandIds: [],
  gradeIds: [],
};

const PAGE_SIZE = 12;

export function ShopFiltersClient() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTERS);
  const { addItem } = useCart();

  // Data state
  const [products, setProducts] = useState<StorefrontProductListItem[]>([]);
  const [filtersData, setFiltersData] = useState<StorefrontFiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

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
    return () => { cancelled = true; };
  }, []);

  // Fetch products when search / sort / filters / page change
  const loadProducts = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const result = await fetchProducts({
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
      });
      setProducts(prev => append ? [...prev, ...result.items] : result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sort, filterState]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    loadProducts(1);
  }, [loadProducts]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadProducts(next, true);
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
              placeholder="Search by name, model, etc"
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
            <SortMenu
              value={sort}
              onChange={setSort}
            />
          </div>
        </div>

        <ProductsGrid
          products={products}
          loading={loading && page === 1}
          cardVariant="inline"
          onAdd={p => {
            addItem({
              slug: p.slug,
              title: p.name,
              priceMinor: p.startingPrice ?? 0,
              imageSrc: p.imageSrc || '/images/placeholder.png',
              qty: 1,
            });
            toast.success('Added to cart.');
          }}
        />

        {/* Load More */}
        {page < totalPages && !loading && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              size="md"
              onClick={loadMore}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
