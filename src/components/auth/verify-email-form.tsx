'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function verify(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(null); setMessage(null); const response = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }); const data = await response.json(); if (!response.ok) setError(data.error || 'Unable to verify email.'); else { setMessage('Email verified successfully.'); setTimeout(() => router.push('/account'), 700); } setLoading(false); }
  async function resend() { setLoading(true); setError(null); setMessage(null); const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); if (!response.ok) setError(data.error || 'Unable to resend code.'); else setMessage('A new verification code has been sent.'); setLoading(false); }
  return <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Verify email</p><h1 className="mt-3 text-3xl font-semibold text-stone-900">Confirm your email address</h1><p className="mt-3 text-sm text-stone-600">Enter the six-digit code sent to your email.</p><form onSubmit={verify} className="mt-8 space-y-4"><label className="sr-only" htmlFor="verification-email">Email address</label><input id="verification-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl border border-stone-300 px-3 py-2" /><label className="sr-only" htmlFor="verification-code">Verification code</label><input id="verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" className="w-full rounded-xl border border-stone-300 px-3 py-2" />{message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}<button type="submit" disabled={loading} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Checking...' : 'Verify email'}</button><button type="button" disabled={loading} onClick={resend} className="w-full rounded-full border border-stone-300 px-3 py-3 font-semibold text-stone-700 disabled:opacity-60">Resend code</button></form></div>;
}
