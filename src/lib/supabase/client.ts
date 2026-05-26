import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPublicSupabaseConfig,
  getPublicSupabaseDiagnostics,
} from './config';

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) return browserClient;

  const config = getPublicSupabaseConfig();
  const diagnostics = getPublicSupabaseDiagnostics();

  console.info('[Supabase:browser.config]', diagnostics);

  if (config.missing) {
    throw new Error(
      `Supabase public configuration error: ${config.issues.join('; ')}`
    );
  }

  browserClient = createBrowserClient(config.url, config.publicKey, {
    global: {
      fetch: (input, init) => {
        const requestUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        try {
          const parsed = new URL(requestUrl);
          console.info('[Supabase:browser.fetch]', {
            host: parsed.hostname,
            path: parsed.pathname,
          });
        } catch {
          console.info('[Supabase:browser.fetch]', { host: 'unknown' });
        }

        return fetch(input, init);
      },
    },
  });

  return browserClient;
}

export { getPublicSupabaseDiagnostics };
