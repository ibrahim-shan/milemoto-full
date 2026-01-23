import { z } from "zod";
import { TrimmedStringSchema } from "./zod.helpers.js";

// Shared Zod schema for pagination and search query parameters
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: TrimmedStringSchema.optional(),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

// Shared Generic Interface for Paginated Responses
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Utility type to enforce consistent Date string serialization for API responses
// Replaces Date objects from DB types with ISO strings
export type ApiModel<T> = Omit<T, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
