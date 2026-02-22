/**
 * Query String Builder Utility
 *
 * Builds URL query strings from an object of parameters.
 * Handles null/undefined values, arrays, and type conversion automatically.
 *
 * @example
 * // Simple usage
 * buildQueryString({ page: 1, limit: 10, search: 'test' })
 * // Returns: 'page=1&limit=10&search=test'
 *
 * @example
 * // With array values (appends multiple times)
 * buildQueryString({ status: ['active', 'pending'], page: 1 })
 * // Returns: 'status=active&status=pending&page=1'
 *
 * @example
 * // With null/undefined (skipped)
 * buildQueryString({ page: 1, search: undefined, filter: null })
 * // Returns: 'page=1'
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined | (string | number)[]>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Handle arrays (append each value separately)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) {
          searchParams.append(key, String(item));
        }
      }
      continue;
    }

    // Handle primitives
    searchParams.append(key, String(value));
  }

  return searchParams.toString();
}

/**
 * Builds a full URL path with query string.
 *
 * @example
 * buildUrlWithQuery('/admin/brands', { page: 1, limit: 10 })
 * // Returns: '/admin/brands?page=1&limit=10'
 *
 * @example
 * // Empty params returns path without query string
 * buildUrlWithQuery('/admin/brands', {})
 * // Returns: '/admin/brands'
 */
export function buildUrlWithQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined | (string | number)[]>,
): string {
  const queryString = buildQueryString(params);
  return queryString ? `${path}?${queryString}` : path;
}
