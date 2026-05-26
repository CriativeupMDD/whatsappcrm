import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logSupabaseError } from '@/lib/supabase/errors'

export async function POST(request: Request) {
  let payload: { fullName?: string; email?: string; password?: string }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const fullName = payload.fullName?.trim()
  const email = payload.email?.trim().toLowerCase()
  const password = payload.password

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: 'Full name, email and password are required' },
      { status: 400 },
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (createError) {
      const classified = logSupabaseError('signup.createUser', createError)
      return NextResponse.json(
        { error: createError.message, kind: classified.kind },
        { status: createError.status ?? 400 },
      )
    }

    const user = data.user
    if (!user) {
      return NextResponse.json(
        { error: 'Supabase Auth did not return a user' },
        { status: 502 },
      )
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        full_name: fullName,
        email,
        role: 'user',
      },
      { onConflict: 'user_id' },
    )

    if (profileError) {
      const classified = logSupabaseError('signup.upsertProfile', profileError)
      return NextResponse.json(
        {
          error: 'User was created in Auth, but profile creation failed',
          kind: classified.kind,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const classified = logSupabaseError('signup.unhandled', error)
    return NextResponse.json(
      { error: 'Unexpected signup error', kind: classified.kind },
      { status: 500 },
    )
  }
}
