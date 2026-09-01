'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
    };

    // Use unified login endpoint; server will route based on role
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || 'Invalid email or password.');
      return;
    }

    const redirectTo = data?.redirect;
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push('/account');
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Admin</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Admin login</h1>
      <p className="mt-3 text-sm text-stone-600">Use your authorized administrator credentials.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-4 py-3 font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Signing in...' : 'Sign in as admin'}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-600">
        Forgot your admin password? <a href="/forgot-password" className="font-semibold text-amber-600">Reset it here</a>
      </p>
    </div>
  );
}
