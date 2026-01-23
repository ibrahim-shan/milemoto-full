import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
