'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, Filter, X } from 'lucide-react';

import { Button } from '@/ui/button';
import { Calendar } from '@/ui/calendar';
import { Checkbox } from '@/ui/checkbox';
import { GeneralCombobox, MultiSelectCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Separator } from '@/ui/separator';
import { StatusBadge } from '@/ui/status-badge';
import { Switch } from '@/ui/switch';     

export type FilterType = 'select' | 'multiselect' | 'range' | 'date-range' | 'boolean' | 'text';

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string; // Field name in filter state
  label: string;
  type: FilterType;
  fullWidth?: boolean;
  placeholder?: string;
  options?: FilterOption[]; // For select/multiselect
  minKey?: string; // For range (e.g., 'ordersMin')
  maxKey?: string; // For range (e.g., 'ordersMax')
  startKey?: string; // For date-range
  endKey?: string; // For date-range
};

type GenericFilterProps = {
  config: FilterConfig[];
  filters: Record<string, string | number | boolean | string[] | undefined>;
  draftFilters?: Record<string, string | number | boolean | string[] | undefined>;
  onDraftFiltersChange?: (
    filters: Record<string, string | number | boolean | string[] | undefined>,
  ) => void;
  onFilterChange: (
    filters: Record<string, string | number | boolean | string[] | undefined>,
  ) => void;
  search?: React.ReactNode;
  actions?: React.ReactNode;
};

function parseDateOnly(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year = NaN, month = NaN, day = NaN] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function toDateOnlyValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function GenericFilter({
  config,
  filters,
  draftFilters,
  onDraftFiltersChange,
  onFilterChange,
  search,
  actions,
}: GenericFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalLocalFilters, setInternalLocalFilters] = useState(filters);
  const isDraftControlled = draftFilters !== undefined && onDraftFiltersChange !== undefined;
  const localFilters = isDraftControlled ? draftFilters : internalLocalFilters;
  const setLocalFilters = (
    next:
      | Record<string, string | number | boolean | string[] | undefined>
      | ((
          previous: Record<string, string | number | boolean | string[] | undefined>,
        ) => Record<string, string | number | boolean | string[] | undefined>),
  ) => {
    if (isDraftControlled) {
      const resolved = typeof next === 'function' ? next(localFilters) : next;
      onDraftFiltersChange(resolved);
      return;
    }

    setInternalLocalFilters(previous => (typeof next === 'function' ? next(previous) : next));
  };

  useEffect(() => {
    if (!isDraftControlled) {
      setInternalLocalFilters(filters);
    }
  }, [filters, isDraftControlled]);

  const activeFilterCount = config.reduce((count, item) => {
    if (item.key === 'filterMode') {
      return count;
    }
    if (item.type === 'multiselect') {
      return count + ((localFilters[item.key] as string[])?.length > 0 ? 1 : 0);
    }
    if (item.type === 'select') {
      return count + (localFilters[item.key] ? 1 : 0);
    }
    if (item.type === 'range') {
      return count + (localFilters[item.minKey!] || localFilters[item.maxKey!] ? 1 : 0);
    }
    if (item.type === 'date-range') {
      return count + (localFilters[item.startKey!] || localFilters[item.endKey!] ? 1 : 0);
    }
    if (item.type === 'boolean') {
      return count + (localFilters[item.key] === true ? 1 : 0);
    }
    if (item.type === 'text') {
      const value = localFilters[item.key];
      return count + (typeof value === 'string' && value.trim().length > 0 ? 1 : 0);
    }
    return count;
  }, 0);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetState: Record<string, string | number | boolean | string[] | undefined> = {};
    config.forEach(item => {
      if (item.type === 'multiselect') {
        resetState[item.key] = [];
      } else if (item.type === 'boolean') {
        resetState[item.key] = false;
      } else if (item.type === 'range') {
        if (item.minKey) resetState[item.minKey] = '';
        if (item.maxKey) resetState[item.maxKey] = '';
      } else if (item.type === 'date-range') {
        if (item.startKey) resetState[item.startKey] = '';
        if (item.endKey) resetState[item.endKey] = '';
      } else if (item.key === 'filterMode') {
        resetState[item.key] = 'all';
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

  const matchModeConfig = config.find(item => item.key === 'filterMode' && item.type === 'select');
  const renderConfig = config.filter(item => item.key !== 'filterMode');

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
                {matchModeConfig && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <div className="space-y-3">
                      <Label className="text-muted-foreground text-xs font-semibold">Match</Label>
                      <div className="flex flex-wrap items-center gap-6">
                        <label
                          htmlFor="filter-mode-all"
                          className="inline-flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id="filter-mode-all"
                            checked={(localFilters.filterMode as string | undefined) !== 'any'}
                            onCheckedChange={checked => {
                              if (checked) {
                                setLocalFilters(prev => ({ ...prev, filterMode: 'all' }));
                              }
                            }}
                            aria-label="Match all selected filters"
                          />
                          <span>
                            {matchModeConfig.options?.find(option => option.value === 'all')
                              ?.label ?? 'All selected filters'}
                          </span>
                        </label>
                        <label
                          htmlFor="filter-mode-any"
                          className="inline-flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id="filter-mode-any"
                            checked={(localFilters.filterMode as string | undefined) === 'any'}
                            onCheckedChange={checked => {
                              if (checked) {
                                setLocalFilters(prev => ({ ...prev, filterMode: 'any' }));
                              } else {
                                setLocalFilters(prev => ({ ...prev, filterMode: 'all' }));
                              }
                            }}
                            aria-label="Match any selected filter"
                          />
                          <span>
                            {matchModeConfig.options?.find(option => option.value === 'any')
                              ?.label ?? 'Any selected filter'}
                          </span>
                        </label>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}
                {renderConfig.map(item => (
                  <div
                    key={item.key}
                    className={item.fullWidth ? 'space-y-2 md:col-span-2 lg:col-span-3' : 'space-y-2'}
                  >
                    <Label className="text-muted-foreground whitespace-pre-line text-xs font-semibold">
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
                        placeholder={item.placeholder ?? `Select ${item.label}...`}
                        className="w-full"
                      />
                    )}

                    {item.type === 'range' && item.minKey && item.maxKey && (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Min"
                          type="number"
                          className="h-9"
                          value={
                            typeof localFilters[item.minKey] === 'boolean'
                              ? ''
                              : ((localFilters[item.minKey] as string | number | string[] | undefined) ??
                                '')
                          }
                          onChange={e =>
                            setLocalFilters(prev => ({ ...prev, [item.minKey!]: e.target.value }))
                          }
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          placeholder="Max"
                          type="number"
                          className="h-9"
                          value={
                            typeof localFilters[item.maxKey] === 'boolean'
                              ? ''
                              : ((localFilters[item.maxKey] as string | number | string[] | undefined) ??
                                '')
                          }
                          onChange={e =>
                            setLocalFilters(prev => ({ ...prev, [item.maxKey!]: e.target.value }))
                          }
                        />
                      </div>
                    )}

                    {item.type === 'date-range' && item.startKey && item.endKey && (
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="grid w-44 gap-1">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
                            From
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-input focus-visible:ring-ring h-9 w-full justify-between rounded-md bg-transparent px-3 py-1 text-left text-sm font-normal shadow-sm transition-colors focus-visible:ring-1"
                              >
                                <span className="flex-1 truncate text-left">
                                  {parseDateOnly(localFilters[item.startKey])
                                    ? parseDateOnly(
                                        localFilters[item.startKey],
                                      )!.toLocaleDateString()
                                    : 'Select date'}
                                </span>
                                <CalendarDays className="text-muted-foreground ml-auto h-4 w-4 shrink-0" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-auto p-0"
                            >
                              <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                selected={parseDateOnly(localFilters[item.startKey])}
                                onSelect={date => { 
                                  if (!date) return;
                                  setLocalFilters(prev => ({
                                    ...prev,
                                    [item.startKey!]: toDateOnlyValue(date),
                                  }));
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid w-44 gap-1">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
                            To
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-input focus-visible:ring-ring h-9 w-full justify-between rounded-md bg-transparent px-3 py-1 text-left text-sm font-normal shadow-sm transition-colors focus-visible:ring-1"
                              >
                                <span className="flex-1 truncate text-left">
                                  {parseDateOnly(localFilters[item.endKey])
                                    ? parseDateOnly(localFilters[item.endKey])!.toLocaleDateString()
                                    : 'Select date'}
                                </span>
                                <CalendarDays className="text-muted-foreground ml-auto h-4 w-4 shrink-0" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-auto p-0"
                            >
                              <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                selected={parseDateOnly(localFilters[item.endKey])}
                                onSelect={date => {
                                  if (!date) return;
                                  setLocalFilters(prev => ({
                                    ...prev,
                                    [item.endKey!]: toDateOnlyValue(date),
                                  }));
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}

                    {item.type === 'boolean' && (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <Label
                          htmlFor={`filter-${item.key}`}
                          className="text-sm font-medium"
                        >
                          {item.label}
                        </Label>
                        <Switch
                          id={`filter-${item.key}`}
                          checked={localFilters[item.key] === true}
                          onCheckedChange={checked =>
                            setLocalFilters(prev => ({ ...prev, [item.key]: checked }))
                          }
                          aria-label={item.label}
                        />
                      </div>
                    )}

                    {item.type === 'text' && (
                      <Input
                        placeholder={item.placeholder ?? item.label}
                        className="h-9"
                        value={(() => {
                          const value = localFilters[item.key];
                          return typeof value === 'string' ? value : '';
                        })()}
                        onChange={event =>
                          setLocalFilters(prev => ({ ...prev, [item.key]: event.target.value }))
                        }
                      />
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
