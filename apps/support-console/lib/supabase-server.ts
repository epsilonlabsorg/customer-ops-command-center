import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type CachedClient = { url: string; key: string; client: SupabaseClient };
let cached: CachedClient | null = null;

function readEnvironment(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^['"]|['"]$/g, '');
    if (value) return value;
  }
  return null;
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = readEnvironment('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = readEnvironment('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  if (cached?.url === url && cached.key === key) return cached.client;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  cached = { url, key, client };
  return client;
}