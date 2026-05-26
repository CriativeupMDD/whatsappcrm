import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertPublicSupabaseConfig, getSupabaseSecretKey } from './config'

let adminClient: SupabaseClient | undefined

export function createAdminClient() {
  if (adminClient) return adminClient

  const { url } = assertPublicSupabaseConfig()
  const secretKey = getSupabaseSecretKey()

  adminClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
