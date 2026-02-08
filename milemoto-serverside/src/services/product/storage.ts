import { logger } from '../../utils/logger.js';
import { isSupabaseConfigured, supabase } from '../../integrations/supabase.js';

export async function deleteImageFromStorage(url: string) {
  try {
    if (!isSupabaseConfigured || !supabase) return;
    const match = url.match(/storage\/v1\/object\/public\/([^?]+)/);
    const path = match?.[1];
    if (!path) return;
    const { error } = await supabase.storage.from('images').remove([path]);
    if (error) {
      logger.warn({ error, url }, 'Error deleting image from Supabase storage');
    }
  } catch (err) {
    logger.warn({ err, url }, 'Error deleting image from Supabase storage');
  }
}

/**
 * Batch delete images and log any failures.
 * This is fire-and-forget but with proper logging for observability.
 */
export function deleteImagesWithLogging(urls: string[], context?: string): void {
  if (urls.length === 0) return;

  void Promise.allSettled(urls.map((url) => deleteImageFromStorage(url))).then((results) => {
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0) {
      logger.error(
        {
          failureCount: failures.length,
          totalCount: urls.length,
          context,
          errors: failures.map((f) => String(f.reason)),
        },
        'Failed to delete some product images'
      );
    }
  });
}
