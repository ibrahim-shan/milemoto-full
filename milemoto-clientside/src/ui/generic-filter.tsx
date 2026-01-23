'use client';

import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Filter, X } from 'lucide-react';

import { Button } from '@/ui/button';
import { GeneralCombobox, MultiSelectCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import { StatusBadge } from '@/ui/status-badge';

export type FilterType = 'select' | 'multiselect' | 'range' | 'date-range';

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string; // Field name in filter state
  label: string;
  type: FilterType;
  options?: FilterOption[]; // For select/multiselect
  minKey?: string; // For range (e.g., 'ordersMin')
  maxKey?: string; // For range (e.g., 'ordersMax')
  startKey?: string; // For date-range
  endKey?: string; // For date-range
};

type GenericFilterProps = {
  config: FilterConfig[];
  filters: Record<string, string | number | string[] | undefined>;
  onFilterChange: (filters: Record<string, string | number | string[] | undefined>) => void;
  search?: React.ReactNode;
  actions?: React.ReactNode;
};

export function GenericFilter({
  config,
  filters,
  onFilterChange,
  search,
  actions,
}: GenericFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters when prop changes (if needed, but usually we want to keep local state until applied)
  // However, if we want to support external resets, we might need a useEffect.
  // For now, let's just initialize.

  const activeFilterCount = config.reduce((count, item) => {
    if (item.type === 'multiselect') {
      return count + ((filters[item.key] as string[])?.length > 0 ? 1 : 0);
    }
    if (item.type === 'select') {
      return count + (filters[item.key] ? 1 : 0);
    }
    if (item.type === 'range') {
      return count + (filters[item.minKey!] || filters[item.maxKey!] ? 1 : 0);
    }
    if (item.type === 'date-range') {
      return count + (filters[item.startKey!] || filters[item.endKey!] ? 1 : 0);
    }
    return count;
  }, 0);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetState: Record<string, string | number | string[] | undefined> = {};
    config.forEach(item => {
      if (item.type === 'multiselect') {
        resetState[item.key] = [];
      } else if (item.type === 'range') {
        if (item.minKey) resetState[item.minKey] = '';
        if (item.maxKey) resetState[item.maxKey] = '';
      } else if (item.type === 'date-range') {
        if (item.startKey) resetState[item.startKey] = '';
        if (item.endKey) resetState[item.endKey] = '';
      } else {
        resetState[item.key] = '';
      }
    });
    setLocalFilters(resetState);
    onFilterChange(resetState);
    setIsOpen(false);
  };

  const handleRemoveMultiSelectValue = (key: string, value: string | number) => {
    const current = (localFilters[key] as string[]) || [];
    const next = current.filter(item => String(item) !== String(value));
    setLocalFilters(prev => ({ ...prev, [key]: next }));
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">{search}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 h-4"
                />
                <StatusBadge className="rounded-sm px-1 font-normal">
                  {activeFilterCount}
                </StatusBadge>
              </>
            )}
            <ChevronDown
              className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </Button>
          {actions}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card text-card-foreground rounded-md border p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-medium leading-none">Filters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  justify="center"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {config.map(item => (
                  <div
                    key={item.key}
                    className="space-y-2"
                  >
                    <Label className="text-muted-foreground text-xs font-semibold">
                      {item.label}
                    </Label>

                    {item.type === 'multiselect' && item.options && (
                      <MultiSelectCombobox
                        data={item.options.map(option => ({
                          label: option.label,
                          value: option.value,
                        }))}
                        value={(localFilters[item.key] as string[]) || []}
                        onChange={values =>
                          setLocalFilters(prev => ({ ...prev, [item.key]: values }))
                        }
                        placeholder={`Select ${item.label}...`}
                        className="w-full"
                        renderValue={selectedItems => (
                          <div className="flex flex-wrap items-center gap-1">
                            {selectedItems.map(selectedItem => (
                              <span
                                key={selectedItem.value}
                                className="border-border bg-muted text-foreground inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px]"
                              >
                                {selectedItem.label}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="text-muted-foreground hover:text-foreground inline-flex"
                                  onPointerDown={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleRemoveMultiSelectValue(item.key, selectedItem.value);
                                  }}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleRemoveMultiSelectValue(item.key, selectedItem.value);
                                    }
                                  }}
                                  aria-label={`Remove ${selectedItem.label}`}
                                >
                                  <X className="h-3 w-3" />
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      />
                    )}

                    {item.type === 'select' && item.options && (
                      <GeneralCombobox
                        data={[
                          { label: 'All', value: '' },
                          ...item.options.map(opt => ({
                            label: opt.label,
                            value: opt.value,
                          })),
                        ]}
                        value={(localFilters[item.key] as string | number) || ''}
                        onChange={val => setLocalFilters(prev => ({ ...prev, [item.key]: val }))}
                        placeholder={`Select ${item.label}...`}
                        className="w-full"
                      />
                    )}

                    {item.type === 'range' && item.minKey && item.maxKey && (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Min"
                          type="number"
                          className="h-8"
                          value={localFilters[item.minKey] || ''}
                          onChange={e =>
                            setLocalFilters(prev => ({ ...prev, [item.minKey!]: e.target.value }))
                          }
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          placeholder="Max"
                          type="number"
                          className="h-8"
                          value={localFilters[item.maxKey] || ''}
                          onChange={e =>
                            setLocalFilters(prev => ({ ...prev, [item.maxKey!]: e.target.value }))
                          }
                        />
                      </div>
                    )}

                    {item.type === 'date-range' && item.startKey && item.endKey && (
                      <div className="flex items-center gap-2">
                        <div className="grid flex-1 gap-1">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
                            From
                          </Label>
                          <Input
                            type="date"
                            className="block h-8"
                            value={localFilters[item.startKey] || ''}
                            onChange={e =>
                              setLocalFilters(prev => ({
                                ...prev,
                                [item.startKey!]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="grid flex-1 gap-1">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
                            To
                          </Label>
                          <Input
                            type="date"
                            className="block h-8"
                            value={localFilters[item.endKey] || ''}
                            onChange={e =>
                              setLocalFilters(prev => ({ ...prev, [item.endKey!]: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  variant="solid"
                  size="sm"
                  onClick={handleApply}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
