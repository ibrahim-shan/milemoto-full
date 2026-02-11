// src/features/shop/components/ShopFilters.tsx
'use client';

import { useState } from 'react';

import { PriceFilter } from './PriceFilter';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';

import { Checkbox } from '@/ui/checkbox';

import type { StorefrontFiltersResponse } from '@/types';

export type FilterState = {
  categoryIds: number[];
  subCategoryIds: number[];
  brandIds: number[];
  gradeIds: number[];
  minPrice?: number;
  maxPrice?: number;
};

type Props = {
  filters: StorefrontFiltersResponse | null;
  loading?: boolean;
  value: FilterState;
  onChange: (next: FilterState) => void;
};

export function ShopFilters({ filters, loading, value, onChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggleOpen = (name: string) => setOpen(prev => ({ ...prev, [name]: !prev[name] }));

  const toggleId = (key: 'categoryIds' | 'subCategoryIds' | 'brandIds' | 'gradeIds', id: number) => {
    const current = value[key];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    onChange({ ...value, [key]: next });
  };

  const handlePriceApply = (min: number, max: number) => {
    onChange({ ...value, minPrice: min, maxPrice: max });
  };

  if (loading) {
    return (
      <div
        role="group"
        aria-label="Filter groups"
        className="border-border/60 bg-card flex items-center justify-center rounded-xl border p-8"
      >
        <Loader2 className="text-foreground/40 h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!filters) return null;

  return (
    <div
      role="group"
      aria-label="Filter groups"
      className="border-border/60 bg-card space-y-6 rounded-xl border p-4"
    >
      {/* Categories */}
      {filters.categories.length > 0 && (
        <div>
          <h2 className="text-foreground text-base font-semibold">Categories</h2>
          <ul className="mt-3 space-y-2">
            {filters.categories.map(cat => {
              const isOpen = !!open[`cat-${cat.id}`];
              const catId = `cat-${cat.id}`;
              const panelId = `${catId}-subs`;
              const checked = value.categoryIds.includes(cat.id);
              return (
                <li
                  key={cat.id}
                  className="rounded-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={catId}
                        checked={checked}
                        onCheckedChange={() => toggleId('categoryIds', cat.id)}
                      />
                      <label
                        htmlFor={catId}
                        className="cursor-pointer text-sm"
                      >
                        {cat.name}
                        <span className="text-foreground/50 ml-1 text-xs">({cat.count})</span>
                      </label>
                    </div>

                    {cat.subCategories.length > 0 ? (
                      <button
                        type="button"
                        aria-label={`Toggle ${cat.name} subcategories`}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleOpen(`cat-${cat.id}`)}
                        className="hover:bg-muted/60 grid h-7 w-7 place-items-center rounded-md"
                        title={`Toggle ${cat.name}`}
                      >
                        <ChevronDown
                          className={`text-foreground/60 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''
                            }`}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span
                        className="h-7 w-7"
                        aria-hidden
                        role="presentation"
                      />
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && cat.subCategories.length > 0 && (
                      <motion.ul
                        id={panelId}
                        role="group"
                        aria-label={`${cat.name} subcategories`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-6 mt-2 space-y-2 overflow-hidden"
                      >
                        {cat.subCategories.map(sub => {
                          const sid = `sub-${sub.id}`;
                          const subChecked = value.subCategoryIds.includes(sub.id);
                          return (
                            <li
                              key={sub.id}
                              className="flex items-center"
                            >
                              <Checkbox
                                id={sid}
                                checked={subChecked}
                                onCheckedChange={() => toggleId('subCategoryIds', sub.id)}
                              />
                              <label
                                htmlFor={sid}
                                className="text-foreground/80 ml-2 cursor-pointer text-sm"
                              >
                                {sub.name}
                                <span className="text-foreground/50 ml-1 text-xs">
                                  ({sub.count})
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Brands */}
      {filters.brands.length > 0 && (
        <div>
          <h2 className="text-foreground text-base font-semibold">Brands</h2>
          <ul className="mt-3 space-y-2">
            {filters.brands.map(brand => {
              const bid = `brand-${brand.id}`;
              const checked = value.brandIds.includes(brand.id);
              return (
                <li
                  key={brand.id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={bid}
                    checked={checked}
                    onCheckedChange={() => toggleId('brandIds', brand.id)}
                  />
                  <label
                    htmlFor={bid}
                    className="cursor-pointer text-sm"
                  >
                    {brand.name}
                    <span className="text-foreground/50 ml-1 text-xs">({brand.count})</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Grades */}
      {filters.grades.length > 0 && (
        <div>
          <h2 className="text-foreground text-base font-semibold">Grades</h2>
          <ul className="mt-3 space-y-2">
            {filters.grades.map(grade => {
              const gid = `grade-${grade.id}`;
              const checked = value.gradeIds.includes(grade.id);
              return (
                <li
                  key={grade.id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={gid}
                    checked={checked}
                    onCheckedChange={() => toggleId('gradeIds', grade.id)}
                  />
                  <label
                    htmlFor={gid}
                    className="cursor-pointer text-sm"
                  >
                    {grade.name}
                    <span className="text-foreground/50 ml-1 text-xs">({grade.count})</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PriceFilter onApply={handlePriceApply} />
    </div>
  );
}
