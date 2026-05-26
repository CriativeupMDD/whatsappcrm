'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createClient,
  getPublicSupabaseDiagnostics,
} from '@/lib/supabase/client';
import { logSupabaseError } from '@/lib/supabase/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

function isFetchFailure(error: Error | null) {
  if (!error) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    error.name === 'TypeError'
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const diagnostics = getPublicSupabaseDiagnostics();
    console.info('[Supabase:login.config]', diagnostics);

    let error: Error | null = null;

    const signInViaServerRoute = async (reason: string) => {
      console.warn('[Supabase:login.fallback]', {
        reason,
        fetchHost: window.location.host,
        fetchPath: '/api/auth/login',
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as {
        error?: string;
        kind?: string;
      };

      if (!response.ok || body.error) {
        return new Error(body.error ?? 'Login failed');
      }

      return null;
    };

    if (diagnostics.issues.length === 0) {
      try {
        const supabase = createClient();
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = result.error;
      } catch (caught) {
        logSupabaseError('login.browser.unhandled', caught);
        error = caught instanceof Error ? caught : new Error(String(caught));
      }

      try {
        if (isFetchFailure(error)) {
          error = await signInViaServerRoute('browser Supabase fetch failed');
        }
      } catch (caught) {
        logSupabaseError('login.fallback.fetch', caught);
        error = caught instanceof Error ? caught : new Error(String(caught));
      }
    } else {
      try {
        error = await signInViaServerRoute(
          'public env unavailable in browser bundle'
        );
      } catch (caught) {
        logSupabaseError('login.fallback.fetch', caught);
        error = caught instanceof Error ? caught : new Error(String(caught));
      }
    }

    if (error) {
      logSupabaseError('login.signInWithPassword', error);
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
            <MessageSquare className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">Welcome back</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus-visible:border-primary focus-visible:ring-primary/20 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus-visible:border-primary focus-visible:ring-primary/20 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-primary/80">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
