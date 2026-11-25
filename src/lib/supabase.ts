import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkyqbbigfvfaobblxziu.supabase.co';
const supabasePublishableKey = 'sb_publishable_HIzGXC7XaboKJQzF8sztiQ_Qoh4BGr';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
