'use client';

import { useEffect, useMemo, useState } from 'react';

import { GeneralCombobox } from './combobox';
import { getTimeZones } from '@vvo/tzdb';

function getUTCOffset(timeZone: string) {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(now);
  const tzPart = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT';

  const match = tzPart.match(/GMT([+-]?\d{1,2})(?::(\d{2}))?/);

  if (!match) return 'UTC+00:00';

  const hoursRaw = match[1] ?? '0';
  const minutesRaw = match[2] ?? '00';

  // Only prepend '+' if it doesn't already start with '+' or '-'
  const hours = hoursRaw.startsWith('+') || hoursRaw.startsWith('-') ? hoursRaw : `+${hoursRaw}`;
  const minutes = minutesRaw.padStart(2, '0');

  return `UTC${hours}:${minutes}`;
}

export function TimezoneSelector({
  value,
  onChange,
  placeholder = 'Select timezone',
  id,
}: {
  value?: string;
  onChange?: (tz: string) => void;
  placeholder?: string;
  id?: string;
}) {
  // We use local state only for the "uncontrolled" behavior (when value prop is undefined).
  // If value prop is provided, we rely on it directly.
  const [internalValue, setInternalValue] = useState<string>('');

  const timezoneOptions = useMemo(
    () =>
      getTimeZones().map(tz => ({
        value: tz.name,
        label: `${tz.name} (${getUTCOffset(tz.name)})`,
      })),
    [],
  );

  // Auto-detect user's timezone on mount ONLY if no value is present
  useEffect(() => {
    // Check against both the prop and the internal state to ensure we don't overwrite existing data
    if (!value && !internalValue) {
      try {
        const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Update internal state for immediate feedback in uncontrolled mode
        setInternalValue(userTZ);
        // Notify parent
        onChange?.(userTZ);
      } catch (e) {
        // Fallback or ignore if timezone detection fails
        console.error('Timezone detection failed', e);
      }
    }
    // We explicitly exclude 'value' and 'internalValue' from dependencies
    // to act as a "mount-only" default setter, preventing loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine which value to display: Prop takes precedence over internal state
  const displayValue = value !== undefined ? value : internalValue;

  return (
    <GeneralCombobox
      {...(id && { id })}
      placeholder={placeholder}
      data={timezoneOptions}
      value={displayValue}
      onChange={val => {
        const newVal = String(val);
        setInternalValue(newVal);
        onChange?.(newVal);
      }}
    />
  );
}
