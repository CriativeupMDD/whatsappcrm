import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'META_APP_SECRET',
  'NEXT_PUBLIC_SITE_URL',
]

function keyKind(value) {
  if (!value) return 'missing'
  if (value.startsWith('sb_publishable_')) return 'supabase-publishable'
  if (value.startsWith('sb_secret_')) return 'supabase-secret'
  if (value.startsWith('eyJ') && value.split('.').length === 3) return 'supabase-legacy-jwt'
  return 'custom'
}

function statusFor(name, value) {
  if (!value) return { ok: false, message: 'missing' }

  if (name.endsWith('_URL')) {
    try {
      const url = new URL(value)
      return { ok: true, message: `${url.protocol}//${url.hostname}` }
    } catch {
      return { ok: false, message: 'invalid-url' }
    }
  }

  if (name === 'ENCRYPTION_KEY') {
    return /^[0-9a-f]{64}$/i.test(value)
      ? { ok: true, message: 'valid-64-char-hex' }
      : { ok: false, message: 'must-be-64-char-hex' }
  }

  return { ok: true, message: `${keyKind(value)} len=${value.length}` }
}

let failed = false

console.log('[vercel-env] Environment validation')
for (const name of required) {
  const value = process.env[name]
  const status = statusFor(name, value)
  failed ||= !status.ok
  console.log(`[vercel-env] ${name}: ${status.message}`)
}

if (failed) {
  console.warn(
    '[vercel-env] One or more variables are missing/invalid. Build will continue, but runtime Supabase/auth features require these variables in Vercel Project Settings.',
  )
}
