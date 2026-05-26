import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseConfig } from './config'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const { url, publicKey } = getPublicSupabaseConfig()
  if (url.includes('missing-supabase-url.invalid')) {
    console.error(
      '[Supabase:browser] Missing public Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.',
    )
  }

  browserClient = createBrowserClient(url, publicKey)

  return browserClient
}
