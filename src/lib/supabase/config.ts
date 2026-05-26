type SupabaseConfig = {
  url: string;
  publicKey: string;
  missing: boolean;
  issues: string[];
  warnings: string[];
};

export type SupabaseKeyKind =
  | 'publishable'
  | 'legacy-jwt'
  | 'secret'
  | 'unknown';

export type PublicSupabaseDiagnostics = {
  hasUrl: boolean;
  hasPublicKey: boolean;
  urlHost: string | null;
  authTokenUrl: string | null;
  publicKeyKind: SupabaseKeyKind;
  publicKeyPreview: string;
  issues: string[];
  warnings: string[];
};

export function getSupabaseKeyKind(key: string | undefined): SupabaseKeyKind {
  if (!key) return 'unknown';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('sb_secret_')) return 'secret';
  if (key.startsWith('eyJ') && key.split('.').length === 3) return 'legacy-jwt';
  return 'unknown';
}

function getConfiguredPublicKey() {
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ];

  return (
    candidates.find((key) => {
      const keyKind = getSupabaseKeyKind(key?.trim());
      return keyKind === 'publishable' || keyKind === 'legacy-jwt';
    }) ?? candidates.find((key) => key?.trim())
  )?.trim();
}

function maskKey(key: string | undefined) {
  if (!key) return 'missing';
  if (key.length <= 12) return `${key.slice(0, 3)}...len=${key.length}`;
  return `${key.slice(0, 8)}...${key.slice(-4)} len=${key.length}`;
}

function normalizeSupabaseUrl(url: string | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function getPublicSupabaseConfig(): SupabaseConfig {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publicKey = getConfiguredPublicKey()?.trim();
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
  }

  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
        issues.push('NEXT_PUBLIC_SUPABASE_URL must use https');
      }

      if (
        !parsed.hostname.endsWith('.supabase.co') &&
        parsed.hostname !== 'localhost'
      ) {
        warnings.push(
          'NEXT_PUBLIC_SUPABASE_URL host is not a standard Supabase project host'
        );
      }
    } catch {
      issues.push('NEXT_PUBLIC_SUPABASE_URL is invalid');
    }
  }

  if (rawUrl && url && rawUrl.replace(/\/+$/, '') !== url) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL was normalized to its origin');
  }

  if (!publicKey) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing'
    );
  } else {
    const keyKind = getSupabaseKeyKind(publicKey);
    if (keyKind === 'secret') {
      issues.push('A Supabase secret key cannot be used as a public key');
    }

    if (keyKind === 'unknown') {
      issues.push('Supabase public key is invalid or unsupported');
    }
  }

  return {
    url: url || 'https://missing-supabase-url.invalid',
    publicKey: publicKey || 'missing-supabase-public-key',
    missing: issues.length > 0,
    issues,
    warnings,
  };
}

export function getPublicSupabaseDiagnostics(): PublicSupabaseDiagnostics {
  const config = getPublicSupabaseConfig();
  const hasUrl = !config.issues.includes('NEXT_PUBLIC_SUPABASE_URL is missing');
  const hasPublicKey = !config.issues.some(
    (issue) =>
      issue.includes('SUPABASE_ANON_KEY') ||
      issue.includes('SUPABASE_PUBLISHABLE_KEY')
  );

  let urlHost: string | null = null;
  let authTokenUrl: string | null = null;

  if (hasUrl) {
    try {
      const parsed = new URL(config.url);
      urlHost = parsed.hostname;
      authTokenUrl = `${parsed.origin}/auth/v1/token`;
    } catch {
      urlHost = null;
      authTokenUrl = null;
    }
  }

  return {
    hasUrl,
    hasPublicKey,
    urlHost,
    authTokenUrl,
    publicKeyKind: getSupabaseKeyKind(
      hasPublicKey ? config.publicKey : undefined
    ),
    publicKeyPreview: maskKey(hasPublicKey ? config.publicKey : undefined),
    issues: config.issues,
    warnings: config.warnings,
  };
}

export function getSupabaseSecretKey(): string {
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is missing'
    );
  }

  const keyKind = getSupabaseKeyKind(secretKey);
  if (keyKind !== 'secret' && keyKind !== 'legacy-jwt') {
    throw new Error('Supabase server key is invalid or unsupported');
  }

  return secretKey;
}

export function assertPublicSupabaseConfig() {
  const config = getPublicSupabaseConfig();

  if (config.missing) {
    throw new Error(config.issues.join('; '));
  }

  return config;
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
