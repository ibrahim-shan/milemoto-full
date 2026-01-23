import { env } from '../../../config/env.js';

export function buildOAuthRedirect(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return `${env.FRONTEND_BASE_URL}/oauth/google${query ? `?${query}` : ''}`;
}
