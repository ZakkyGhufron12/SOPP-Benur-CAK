import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qurhvthgfgmeyhpnsfjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmh2dGhnZmdtZXlocG5zZmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTgyNDAsImV4cCI6MjA3NDczNDI0MH0.Nju_jM2Ryn6xlxvpFYJ40KVbViC85t3KB4Q2ooxSdKI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);