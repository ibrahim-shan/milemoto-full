'use client';

import * as React from 'react';

import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/ui/button';
import { Calendar } from '@/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

type DateTimePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  datePlaceholder?: string;
  className?: string;
};

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const [datePart = '', timePart = '00:00'] = value.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const [hourStr, minuteStr] = timePart.split(':');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function toLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  disabled = false,
  datePlaceholder = 'Select date',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDateTime = parseLocalDateTime(value);

  const setDateValue = (next: Date) => onChange(toLocalValue(next));

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const base = selectedDateTime ?? new Date();
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      base.getHours(),
      base.getMinutes(),
      0,
      0,
    );
    setDateValue(next);
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', rawValue: string) => {
    const current = selectedDateTime ?? new Date();
    const next = new Date(current);
    if (type === 'hour') {
      const hour12 = Number(rawValue) % 12;
      const isPm = next.getHours() >= 12;
      next.setHours(isPm ? hour12 + 12 : hour12);
    } else if (type === 'minute') {
      next.setMinutes(Number(rawValue));
    } else {
      const hours = next.getHours();
      if (rawValue === 'AM' && hours >= 12) next.setHours(hours - 12);
      if (rawValue === 'PM' && hours < 12) next.setHours(hours + 12);
    }
    setDateValue(next);
  };

  const handleWheelScroll: React.WheelEventHandler<HTMLDivElement> = event => {
    const target = event.currentTarget;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    target.scrollTop += event.deltaY;
  };

  return (
    <div className={className}>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={`${id}-date`}
            disabled={disabled}
            className="border-input focus-visible:ring-ring h-9 w-full justify-between rounded-md bg-transparent px-3 py-1 text-left text-sm font-normal shadow-sm transition-colors focus-visible:ring-1"
          >
            <span className={!selectedDateTime ? 'text-muted-foreground/70' : ''}>
              {selectedDateTime ? format(selectedDateTime, 'MM/dd/yyyy hh:mm aa') : datePlaceholder}
            </span>
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0"
        >
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={selectedDateTime ?? undefined}
              captionLayout="dropdown"
              {...(selectedDateTime ? { defaultMonth: selectedDateTime } : {})}
              onSelect={handleDateSelect}
            />

            <div className="flex flex-col border-t sm:h-[300px] sm:flex-row sm:border-l sm:border-t-0">
              <div
                className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] sm:h-full sm:w-[76px] sm:overflow-y-auto sm:overflow-x-hidden [&::-webkit-scrollbar]:hidden"
                onWheel={handleWheelScroll}
              >
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .reverse()
                    .map(hour => {
                      const selectedHour = selectedDateTime
                        ? selectedDateTime.getHours() % 12
                        : null;
                      return (
                        <Button
                          key={hour}
                          type="button"
                          size="icon"
                          variant={selectedHour === hour % 12 ? 'solid' : 'ghost'}
                          justify="center"
                          className="h-9 w-9 shrink-0 sm:h-8 sm:w-full"
                          onClick={() => handleTimeChange('hour', String(hour))}
                        >
                          {hour}
                        </Button>
                      );
                    })}
                </div>
              </div>

              <div
                className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] sm:h-full sm:w-[76px] sm:overflow-y-auto sm:overflow-x-hidden sm:border-l [&::-webkit-scrollbar]:hidden"
                onWheel={handleWheelScroll}
              >
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 60 }, (_, i) => i).map(minute => {
                    const isSelected = selectedDateTime
                      ? selectedDateTime.getMinutes() === minute
                      : false;
                    return (
                      <Button
                        key={minute}
                        type="button"
                        size="icon"
                        variant={isSelected ? 'solid' : 'ghost'}
                        justify="center"
                        className="h-9 w-9 shrink-0 sm:h-8 sm:w-full"
                        onClick={() => handleTimeChange('minute', String(minute))}
                      >
                        {String(minute).padStart(2, '0')}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div
                className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] sm:h-full sm:w-[76px] sm:overflow-y-auto sm:overflow-x-hidden sm:border-l [&::-webkit-scrollbar]:hidden"
                onWheel={handleWheelScroll}
              >
                <div className="flex p-2 sm:flex-col">
                  {['AM', 'PM'].map(period => {
                    const isSelected = selectedDateTime
                      ? period === 'AM'
                        ? selectedDateTime.getHours() < 12
                        : selectedDateTime.getHours() >= 12
                      : false;
                    return (
                      <Button
                        key={period}
                        type="button"
                        size="icon"
                        variant={isSelected ? 'solid' : 'ghost'}
                        justify="center"
                        className="h-9 w-14 shrink-0 sm:h-8 sm:w-full"
                        onClick={() => handleTimeChange('ampm', period)}
                      >
                        {period}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
