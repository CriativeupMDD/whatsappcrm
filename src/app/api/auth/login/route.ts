import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicSupabaseDiagnostics } from '@/lib/supabase/config';
import { classifySupabaseError, logSupabaseError } from '@/lib/supabase/errors';

export async function POST(request: Request) {
  let payload: { email?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  const diagnostics = getPublicSupabaseDiagnostics();
  console.info('[Supabase:login.route.config]', diagnostics);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const classified = logSupabaseError(
        'login.route.signInWithPassword',
        error
      );
      return NextResponse.json(
        { error: error.message, kind: classified.kind },
        { status: error.status ?? 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const classified = classifySupabaseError(error);
    logSupabaseError('login.route.unhandled', error);
    return NextResponse.json(
      { error: classified.message, kind: classified.kind },
      { status: 500 }
    );
  }
}
