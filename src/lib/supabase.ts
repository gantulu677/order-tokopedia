import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkyqbbigfvfaobblxziu.supabase.co';
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXFiYmlnZnZmYW9iYmx4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4OTkzNDAsImV4cCI6MjExMDQ3NTM0MH0.eQAVNbXm9xBtEZ4VpJsA46lEvnJYZnm3enktYs12Vik';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
