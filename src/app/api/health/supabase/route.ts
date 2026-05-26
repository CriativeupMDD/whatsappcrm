import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPublicSupabaseConfig,
  getSupabaseKeyKind,
  getSiteUrl,
  getSupabaseSecretKey,
} from '@/lib/supabase/config'
import { classifySupabaseError, logSupabaseError } from '@/lib/supabase/errors'

export async function GET() {
  try {
    const { url, publicKey } = getPublicSupabaseConfig()
    const secretKey = getSupabaseSecretKey()
    const supabase = createAdminClient()

    const [users, profiles, clinics] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
      supabase.from('profiles').select('id').limit(1),
      supabase.from('clinics').select('id').limit(1),
    ])

    const checks = {
      env: {
        supabaseUrl: 'present',
        urlHost: new URL(url).hostname,
        publicKeyKind: getSupabaseKeyKind(publicKey),
        serverKeyKind: getSupabaseKeyKind(secretKey),
        siteUrl: getSiteUrl(),
      },
      authAdmin: users.error
        ? { ok: false, ...classifySupabaseError(users.error) }
        : { ok: true },
      profiles: profiles.error
        ? { ok: false, ...classifySupabaseError(profiles.error) }
        : { ok: true },
      clinics: clinics.error
        ? { ok: false, ...classifySupabaseError(clinics.error) }
        : { ok: true },
    }

    return NextResponse.json(checks)
  } catch (error) {
    const classified = logSupabaseError('health', error)
    return NextResponse.json(
      { ok: false, error: classified.message, kind: classified.kind },
      { status: 500 },
    )
  }
}
