'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      identifier: formData.get('identifier')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
    };

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      // Generic message to avoid revealing which part failed
      setError(data.error || 'Invalid email/mobile or password.');
      return;
    }

    // Use server-provided redirect (server determines the destination)
    const redirectTo = data?.redirect;
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      // Fallback to account if server didn't send a destination
      router.push('/account');
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Login</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Welcome back</h1>
      <p className="mt-3 text-sm text-stone-600">Sign in with your email or mobile number.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="identifier">Email or mobile number</label>
          <input id="identifier" name="identifier" type="text" autoComplete="username" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
        <Link href="/forgot-password" className="font-semibold text-amber-600">Forgot password?</Link>
        <span>New here? <Link href="/register" className="font-semibold text-amber-600">Create account</Link></span>
      </div>
    </div>
  );
}
