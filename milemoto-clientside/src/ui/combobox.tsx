'use client';

import * as React from 'react';

import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

export interface ComboboxItem {
  value: string | number;
  label: string;
  searchValue?: string; // Explicitly define this as it is used in the render loop
  disabled?: boolean;
  [key: string]: unknown; // Use unknown instead of any for extra props
}

interface GeneralComboboxProps {
  data: ComboboxItem[];
  placeholder?: string;
  emptyMessage?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function GeneralCombobox({
  data = [],
  placeholder = 'Select...',
  emptyMessage = 'No results found.',
  value,
  onChange,
  searchValue,
  onSearchChange,
  className,
  disabled = false,
  id,
}: GeneralComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState('');
  const [search, setSearch] = React.useState('');

  const resolvedSearchValue = searchValue ?? search;

  const selectedValue = value ?? internal;
  const selectedLabel =
    selectedValue !== undefined && selectedValue !== null && String(selectedValue) !== ''
      ? data.find(i => String(i.value) === String(selectedValue))?.label
      : undefined;
  const hasSelection = Boolean(selectedLabel);

  const updateValue = (val: string | number) => {
    if (onChange) onChange(val);
    else setInternal(String(val));
  };

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    }
    if (searchValue === undefined) {
      setSearch(val);
    }
  };

  return (
    <Popover
      open={disabled ? false : open}
      {...(!disabled && { onOpenChange: (val: boolean) => setOpen(val) })}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={selectedLabel ?? placeholder}
          className={cn(
            'border-input ring-offset-background flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
            '!focus:ring-1 !focus:ring-ring',
            '[&>span]:line-clamp-1',
            className,
          )}
        >
          <span className={cn('line-clamp-1', !hasSelection && 'text-muted-foreground/70')}>
            {selectedLabel ?? placeholder}
          </span>

          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>

      {!disabled && (
        <PopoverContent
          className="w-full overflow-hidden p-0"
          align="start"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={8}
          style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
        >
          <Command className="overflow-hidden">
            <CommandInput
              aria-label="Search options"
              placeholder="Search..."
              className="h-9 text-sm"
              value={resolvedSearchValue}
              onValueChange={handleSearchChange}
            />

            <CommandList
              className="max-h-75 overflow-y-auto overscroll-contain"
              onWheel={e => {
                e.stopPropagation();
              }}
            >
              <CommandEmpty>{emptyMessage}</CommandEmpty>

              <CommandGroup className="p-1">
                {data.map(item => (
                  <CommandItem
                    key={item.value}
                    value={item.searchValue || item.label}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
                      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                      item.disabled && 'pointer-events-none opacity-40',
                    )}
                    data-disabled={item.disabled ? 'true' : 'false'}
                    aria-disabled={item.disabled || undefined}
                    onSelect={() => {
                      if (item.disabled) return;
                      updateValue(item.value);
                      setOpen(false);
                    }}
                    data-selected={String(selectedValue) === String(item.value) ? 'true' : 'false'}
                  >
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      {String(selectedValue) === String(item.value) && (
                        <Check className="h-4 w-4" />
                      )}
                    </span>

                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}

interface MultiSelectProps {
  data: ComboboxItem[];
  placeholder?: string;
  emptyMessage?: string;
  value?: string[];
  onChange?: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  renderValue?: (selected: ComboboxItem[]) => React.ReactNode;
}

export function MultiSelectCombobox({
  data = [],
  placeholder = 'Select...',
  emptyMessage = 'No results found.',
  value,
  onChange,
  className,
  disabled = false,
  id,
  renderValue,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<string[]>([]);

  const selectedValues = value ?? internal;
  const selectedSet = new Set(selectedValues.map(val => String(val)));
  const selectedItems = data.filter(item => selectedSet.has(String(item.value)));

  const updateValues = (val: string | number) => {
    const valueString = String(val);
    const next = selectedSet.has(valueString)
      ? selectedValues.filter(item => String(item) !== valueString)
      : [...selectedValues.map(String), valueString];

    if (onChange) onChange(next);
    else setInternal(next);
  };

  return (
    <Popover
      open={disabled ? false : open}
      {...(!disabled && { onOpenChange: (val: boolean) => setOpen(val) })}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={selectedItems.length > 0 ? 'Selected options' : placeholder}
          className={cn(
            'border-input ring-offset-background flex min-h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm outline-none',
            '!focus:ring-1 !focus:ring-ring',
            '[&>span]:line-clamp-1',
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">
            {selectedItems.length > 0 ? (
              renderValue ? (
                renderValue(selectedItems)
              ) : (
                <span className="line-clamp-1">
                  {selectedItems.map(item => item.label).join(', ')}
                </span>
              )
            ) : (
              <span className="line-clamp-1">{placeholder}</span>
            )}
          </div>

          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>

      {!disabled && (
        <PopoverContent
          className="w-full overflow-hidden p-0"
          align="start"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={8}
          style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
        >
          <Command className="overflow-hidden">
            <CommandInput
              aria-label="Search options"
              placeholder="Search..."
              className="h-9 text-sm"
            />

            <CommandList
              className="max-h-75 overflow-y-auto overscroll-contain"
              onWheel={e => {
                e.stopPropagation();
              }}
            >
              <CommandEmpty>{emptyMessage}</CommandEmpty>

              <CommandGroup className="p-1">
                {data.map(item => {
                  const isSelected = selectedSet.has(String(item.value));
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.searchValue || item.label}
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
                        'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                        item.disabled && 'pointer-events-none opacity-40',
                      )}
                      data-disabled={item.disabled ? 'true' : 'false'}
                      aria-disabled={item.disabled || undefined}
                      onSelect={() => {
                        if (item.disabled) return;
                        updateValues(item.value);
                      }}
                      data-selected={isSelected ? 'true' : 'false'}
                    >
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        {isSelected && <Check className="h-4 w-4" />}
                      </span>

                      {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
