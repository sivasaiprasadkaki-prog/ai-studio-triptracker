
import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables for production deployment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cbjzqlhkpwaldqxozcxd.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNianpxbGhrcHdhbGRxeG96Y3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODM3OTQsImV4cCI6MjA4NTg1OTc5NH0.5caUiYiZvieeWuM0nrCORGSP4KEUHwKwS2xqj2XgOyI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);