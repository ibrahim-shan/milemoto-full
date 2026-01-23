// src/hooks/useLocalizationFormat.ts
import { useMemo } from 'react';

import { useGetLocalizationSettings } from '@/hooks/useSiteSettingsQueries';

type SupportedDateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type SupportedTimeFormat = '12h' | '24h';

function parseToDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function useLocalizationFormat() {
  const { data } = useGetLocalizationSettings();

  const dateFormat: SupportedDateFormat = data?.dateFormat ?? 'MM/DD/YYYY';
  const timeFormat: SupportedTimeFormat = data?.timeFormat ?? '12h';

  const formatters = useMemo(() => {
    const getParts = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours24 = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const hours12Raw = hours24 % 12 || 12;
      const hours12 = String(hours12Raw).padStart(2, '0');
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      return { year, month, day, hours24, hours12, minutes, ampm };
    };

    const formatDate = (value: string | Date | null | undefined): string => {
      const date = parseToDate(value);
      if (!date) return '';
      const { year, month, day } = getParts(date);
      if (dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
      if (dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      return `${month}/${day}/${year}`; // MM/DD/YYYY
    };

    const formatTime = (value: string | Date | null | undefined): string => {
      const date = parseToDate(value);
      if (!date) return '';
      const { hours24, hours12, minutes, ampm } = getParts(date);
      if (timeFormat === '24h') {
        return `${String(hours24).padStart(2, '0')}:${minutes}`;
      }
      return `${hours12}:${minutes} ${ampm}`;
    };

    const formatDateTime = (value: string | Date | null | undefined): string => {
      const date = parseToDate(value);
      if (!date) return '';
      return `${formatDate(date)} ${formatTime(date)}`;
    };

    // For <input type="date"> – always YYYY-MM-DD
    const toDateInputValue = (value: string | Date | null | undefined): string => {
      const date = parseToDate(value);
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // From date input (YYYY-MM-DD) back to a string you store
    const fromDateInputValue = (value: string): string | undefined => {
      if (!value) return undefined;
      // keep it as YYYY-MM-DD so backend DATE column is happy
      return value;
    };

    return {
      formatDate,
      formatTime,
      formatDateTime,
      toDateInputValue,
      fromDateInputValue,
    };
  }, [dateFormat, timeFormat]);

  return formatters;
}
