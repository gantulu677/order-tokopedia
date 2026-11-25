import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://bkyqbbigfvfaobblxziu.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  'sb_publishable_HIzGXC7XaboKJQzF8sztiQ_Qoh4B4Gr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
