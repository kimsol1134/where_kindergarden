import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars are not set
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export a getter instead of a direct instance
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUGGESTIONS_PER_WINDOW = 5;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if an IP address is rate limited for review suggestions
 * Uses Supabase to count recent submissions
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  
  const { count, error } = await supabase
    .from('review_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('submitter_ip', ip)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: MAX_SUGGESTIONS_PER_WINDOW,
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
    };
  }

  const currentCount = count ?? 0;
  const remaining = Math.max(0, MAX_SUGGESTIONS_PER_WINDOW - currentCount);
  
  return {
    allowed: currentCount < MAX_SUGGESTIONS_PER_WINDOW,
    remaining,
    resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS),
  };
}

/**
 * Get client IP from request headers
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback for local development
  return '127.0.0.1';
}
