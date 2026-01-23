import { ulid } from 'ulid';

export async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const suffix = ulid().slice(-8).toUpperCase();
  return `PO-${year}-${suffix}`;
}
