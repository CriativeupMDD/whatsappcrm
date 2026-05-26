type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export type SupabaseErrorKind =
  | 'missing-env'
  | 'invalid-url'
  | 'invalid-key'
  | 'user-not-found'
  | 'rls'
  | 'missing-table'
  | 'network'
  | 'unknown';

export function classifySupabaseError(error: unknown): {
  kind: SupabaseErrorKind;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
} {
  const err = error as SupabaseLikeError;
  const message = err?.message ?? String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('missing')) {
    return { kind: 'missing-env', message };
  }

  if (normalized.includes('url') && normalized.includes('invalid')) {
    return { kind: 'invalid-url', message };
  }

  if (
    normalized.includes('invalid api key') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('jwt malformed') ||
    normalized.includes('unsupported')
  ) {
    return {
      kind: 'invalid-key',
      message,
      code: err?.code,
      status: err?.status,
    };
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror')
  ) {
    return { kind: 'network', message, code: err?.code, status: err?.status };
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('user not found') ||
    normalized.includes('email not confirmed')
  ) {
    return {
      kind: 'user-not-found',
      message,
      code: err?.code,
      status: err?.status,
    };
  }

  if (
    err?.code === '42501' ||
    normalized.includes('row-level security') ||
    normalized.includes('violates row-level security')
  ) {
    return {
      kind: 'rls',
      message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
    };
  }

  if (
    err?.code === 'PGRST205' ||
    err?.code === '42P01' ||
    normalized.includes('could not find the table') ||
    normalized.includes('does not exist')
  ) {
    return {
      kind: 'missing-table',
      message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
    };
  }

  return {
    kind: 'unknown',
    message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
    status: err?.status,
  };
}

export function logSupabaseError(scope: string, error: unknown) {
  const classified = classifySupabaseError(error);
  console.error(`[Supabase:${scope}] ${classified.kind}`, classified);
  return classified;
}
