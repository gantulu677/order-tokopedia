import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvqrturbkgyxsycdcfwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXJ0dXJia2d5eHN5Y2RjZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDUzNjEsImV4cCI6MjA5Mjk4MTM2MX0.zMwmCC5s6M1hvPD5cRcde-cGxRc5E9NsIGoEnE2htis';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
