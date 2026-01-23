export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function getAffectedRows(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const typed = result as { affectedRows?: number; rowsAffected?: number; rowCount?: number };
  if (typeof typed.affectedRows === 'number') return Number(typed.affectedRows);
  if (typeof typed.rowsAffected === 'number') return Number(typed.rowsAffected);
  if (typeof typed.rowCount === 'number') return Number(typed.rowCount);
  return 0;
}
