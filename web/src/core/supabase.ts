import { createClient } from '@supabase/supabase-js'

// Hardcoded public credentials
// These are safe to expose in the client as they are restricted by Row Level Security (RLS) policies on the server.
const SUPABASE_URL = 'https://gkarjyvzdfzrhaqohbir.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kqU3HJKVZMMRPyszYz0Lfw_GWxbCub9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('%c[Supabase] Client initialized with hardcoded credentials', 'color: #00ff00');
