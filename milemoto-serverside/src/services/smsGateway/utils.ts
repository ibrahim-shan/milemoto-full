export function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}

export function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '');
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
