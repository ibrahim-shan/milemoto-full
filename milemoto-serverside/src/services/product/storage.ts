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
