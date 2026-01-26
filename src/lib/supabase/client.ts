import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _initialized = false;

function getSupabaseClient(): SupabaseClient | null {
  if (_initialized) return _supabase;
  _initialized = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn('[Supabase] Not configured - auth features disabled');
    }
    return null;
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

/** Check if Supabase is available */
export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

/** Lazily initialized Supabase client (avoids build-time errors with static export) */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getSupabaseClient();
    if (!client) {
      // Return no-op functions for auth operations when Supabase is not configured
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOtp: async () => ({ data: null, error: new Error('Supabase not configured') }),
          verifyOtp: async () => ({ data: null, error: new Error('Supabase not configured') }),
          signOut: async () => ({ error: null }),
        };
      }
      return undefined;
    }
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
