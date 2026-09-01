'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password, confirmPassword }),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || 'Unable to reset password.');
      return;
    }

    setMessage('Your password has been updated. You can now sign in.');
    setEmail('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    router.push('/login');
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Reset password</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Use your reset code</h1>
      <p className="mt-3 text-sm text-stone-600">Enter the code sent to your email and pick a new password.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="code">Reset code</label>
          <input id="code" value={code} onChange={(event) => setCode(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="password">New password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>

        {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-600">
        Need a new code? <a href="/forgot-password" className="font-semibold text-amber-600">Request another</a>
      </p>
    </div>
  );
}
