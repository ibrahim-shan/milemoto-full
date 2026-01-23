import { z } from "zod";

// ---- String normalization helpers ------------------------------------------

export const TrimmedStringSchema = z.string().trim();
export const LowerTrimmedStringSchema = z.string().trim().toLowerCase();
export const UpperTrimmedStringSchema = z.string().trim().toUpperCase();

export const OptionalEmailSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  LowerTrimmedStringSchema.email().optional()
);

export const OptionalUrlSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  TrimmedStringSchema.url().optional()
);

export const NullableUrlSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  TrimmedStringSchema.url().nullable()
);

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map((n) => Number(n));
  if (!y || !m || !d) return false;

  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Date-only string for `<input type="date">` and DB `DATE` columns.
 * Format: `YYYY-MM-DD`
 */
export const DateOnlyStringSchema = z
  .string()
  .refine(isValidDateOnly, "Invalid date format. Expected YYYY-MM-DD.");

export const OptionalDateOnlyStringSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  DateOnlyStringSchema.optional()
);

export const NullableDateOnlyStringSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  DateOnlyStringSchema.nullable()
);

/**
 * ISO datetime string for timestamps (API layer).
 * Accepts any Date.parse-able string that includes a time component.
 */
export const IsoDateTimeStringSchema = z
  .string()
  .refine((value) => value.includes("T"), "Invalid datetime format.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid datetime value.");
