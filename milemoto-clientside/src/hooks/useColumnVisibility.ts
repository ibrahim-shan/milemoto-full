'use client';

import * as React from 'react';

type ColumnConfig = {
  id: string;
  alwaysVisible?: boolean;
};

type VisibilityState = Record<string, boolean>;

function buildDefaultVisibility(
  columns: ReadonlyArray<ColumnConfig>,
  overrides?: VisibilityState,
): VisibilityState {
  const defaults = Object.fromEntries(columns.map(column => [column.id, true]));
  return {
    ...defaults,
    ...(overrides ?? {}),
  };
}

function normalizeVisibility(
  columns: ReadonlyArray<ColumnConfig>,
  defaultVisibility: VisibilityState | undefined,
  input: unknown,
): VisibilityState {
  const defaults = buildDefaultVisibility(columns, defaultVisibility);
  if (!input || typeof input !== 'object') return defaults;

  const parsed = input as Record<string, unknown>;
  const out: VisibilityState = { ...defaults };
  for (const column of columns) {
    if (column.alwaysVisible) {
      out[column.id] = true;
      continue;
    }
    const value = parsed[column.id];
    if (typeof value === 'boolean') out[column.id] = value;
  }
  return out;
}

export function useColumnVisibility(
  columns: ReadonlyArray<ColumnConfig>,
  storageKey: string,
  defaultVisibility?: VisibilityState,
) {
  const [visibility, setVisibility] = React.useState<VisibilityState>(() =>
    buildDefaultVisibility(columns, defaultVisibility),
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setVisibility(buildDefaultVisibility(columns, defaultVisibility));
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setVisibility(normalizeVisibility(columns, defaultVisibility, parsed));
      setHydrated(true);
    } catch {
      setVisibility(buildDefaultVisibility(columns, defaultVisibility));
      setHydrated(true);
    }
  }, [columns, storageKey, defaultVisibility]);

  React.useEffect(() => {
    if (!hydrated || !storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch {
      // noop: storage may be unavailable
    }
  }, [visibility, storageKey, hydrated]);

  const isColumnVisible = React.useCallback(
    (id: string) => {
      const column = columns.find(item => item.id === id);
      if (column && 'alwaysVisible' in column && column.alwaysVisible) return true;
      return visibility[id] !== false;
    },
    [columns, visibility],
  );

  const visibleColumnCount = React.useMemo(
    () => columns.reduce((count, column) => count + (isColumnVisible(column.id) ? 1 : 0), 0),
    [columns, isColumnVisible],
  );

  return {
    visibility,
    setVisibility,
    isColumnVisible,
    visibleColumnCount,
  };
}

