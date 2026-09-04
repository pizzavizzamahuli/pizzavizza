'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      mobile: formData.get('mobile')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      confirmPassword: formData.get('confirmPassword')?.toString() ?? '',
      referralCode: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') || '' : '',
    };

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || 'Registration failed.');
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(payload.email)}&mobile=${encodeURIComponent(payload.mobile)}`);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Register</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Create your account</h1>
      <p className="mt-3 text-sm text-stone-600">This foundation phase supports customer registration and secure sessions.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="name">Full name</label>
          <input id="name" name="name" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="mobile">Mobile number</label>
          <input id="mobile" name="mobile" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
          </div>
        </div>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-600">
        Already have an account? <Link href="/login" className="font-semibold text-amber-600">Log in</Link>
      </p>
    </div>
  );
}
