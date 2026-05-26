import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const MASTER_EMAIL = 'gestoranalisamatheus@gmail.com'
const MASTER_PASSWORD = '123456'
const MASTER_NAME = 'Gestora Nalisa Matheus'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

if (!url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
}

if (!secretKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is missing')
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function findUserByEmail(email) {
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) throw error

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    )

    if (user) return user
    if (data.users.length < 100) return null

    page += 1
  }
}

const existingUser = await findUserByEmail(MASTER_EMAIL)
const { data, error } = existingUser
  ? await supabase.auth.admin.updateUserById(existingUser.id, {
      password: MASTER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: MASTER_NAME,
      },
    })
  : await supabase.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: MASTER_NAME,
      },
    })

if (error) throw error

const user = data.user
if (!user) {
  throw new Error('Supabase Auth did not return a user')
}

const { error: profileError } = await supabase.from('profiles').upsert(
  {
    user_id: user.id,
    full_name: MASTER_NAME,
    email: MASTER_EMAIL,
    role: 'master',
  },
  { onConflict: 'user_id' },
)

if (profileError) throw profileError

console.log(`Master user ready: ${MASTER_EMAIL}`)
