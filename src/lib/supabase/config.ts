type SupabaseConfig = {
  url: string
  publicKey: string
  missing: boolean
  issues: string[]
}

export type SupabaseKeyKind = 'publishable' | 'legacy-jwt' | 'secret' | 'unknown'

export function getSupabaseKeyKind(key: string | undefined): SupabaseKeyKind {
  if (!key) return 'unknown'
  if (key.startsWith('sb_publishable_')) return 'publishable'
  if (key.startsWith('sb_secret_')) return 'secret'
  if (key.startsWith('eyJ') && key.split('.').length === 3) return 'legacy-jwt'
  return 'unknown'
}

export function getPublicSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const issues: string[] = []

  if (!url) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is missing')
  }

  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
        issues.push('NEXT_PUBLIC_SUPABASE_URL must use https')
      }
    } catch {
      issues.push('NEXT_PUBLIC_SUPABASE_URL is invalid')
    }
  }

  if (!publicKey) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing',
    )
  } else {
    const keyKind = getSupabaseKeyKind(publicKey)
    if (keyKind === 'secret') {
      issues.push('A Supabase secret key cannot be used as a public key')
    }

    if (keyKind === 'unknown') {
      issues.push('Supabase public key is invalid or unsupported')
    }
  }

  return {
    url: url || 'https://missing-supabase-url.invalid',
    publicKey: publicKey || 'missing-supabase-public-key',
    missing: issues.length > 0,
    issues,
  }
}

export function getSupabaseSecretKey(): string {
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!secretKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is missing')
  }

  const keyKind = getSupabaseKeyKind(secretKey)
  if (keyKind !== 'secret' && keyKind !== 'legacy-jwt') {
    throw new Error('Supabase server key is invalid or unsupported')
  }

  return secretKey
}

export function assertPublicSupabaseConfig() {
  const config = getPublicSupabaseConfig()

  if (config.missing) {
    throw new Error(config.issues.join('; '))
  }

  return config
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
