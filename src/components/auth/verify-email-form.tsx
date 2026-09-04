'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VerifyEmailForm({ initialEmail, initialMobile }: { initialEmail: string; initialMobile: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [mobile, setMobile] = useState(initialMobile);
  const [emailCode, setEmailCode] = useState('');
  const [mobileCode, setMobileCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    const response = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: emailCode }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to verify email.');
    else { setEmailVerified(true); setMessage('Email verified successfully.'); if (mobileVerified) setTimeout(() => router.push('/account'), 700); }
    setLoading(false);
  }

  async function verifyMobile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    const response = await fetch('/api/auth/verify-mobile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, code: mobileCode }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to verify mobile number.');
    else { setMobileVerified(true); setMessage('Mobile number verified successfully.'); if (emailVerified) setTimeout(() => router.push('/account'), 700); }
    setLoading(false);
  }

  async function resendEmail() {
    setLoading(true); setError(null); setMessage(null);
    const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to resend code.'); else setMessage('A new verification code has been sent.');
    setLoading(false);
  }

  return <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Verify account</p><h1 className="mt-3 text-3xl font-semibold text-stone-900">Confirm your contact details</h1><p className="mt-3 text-sm text-stone-600">Verify both codes before signing in.</p><form onSubmit={verifyEmail} className="mt-8 space-y-4"><h2 className="font-semibold text-stone-900">Email verification</h2><label className="sr-only" htmlFor="verification-email">Email address</label><input id="verification-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl border border-stone-300 px-3 py-2" /><label className="sr-only" htmlFor="verification-code">Email verification code</label><input id="verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="Email 6-digit code" className="w-full rounded-xl border border-stone-300 px-3 py-2" /><button type="submit" disabled={loading || emailVerified} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{emailVerified ? 'Email verified' : loading ? 'Checking...' : 'Verify email'}</button><button type="button" disabled={loading} onClick={resendEmail} className="w-full rounded-full border border-stone-300 px-3 py-3 font-semibold text-stone-700 disabled:opacity-60">Resend email code</button></form><form onSubmit={verifyMobile} className="mt-6 space-y-4 border-t border-stone-100 pt-6"><h2 className="font-semibold text-stone-900">Mobile verification</h2><label className="sr-only" htmlFor="verification-mobile">Mobile number</label><input id="verification-mobile" type="tel" required value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Mobile number" className="w-full rounded-xl border border-stone-300 px-3 py-2" /><label className="sr-only" htmlFor="mobile-verification-code">Mobile verification code</label><input id="mobile-verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={mobileCode} onChange={(event) => setMobileCode(event.target.value)} placeholder="Mobile 6-digit code" className="w-full rounded-xl border border-stone-300 px-3 py-2" /><button type="submit" disabled={loading || mobileVerified} className="w-full rounded-full bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{mobileVerified ? 'Mobile verified' : loading ? 'Checking...' : 'Verify mobile'}</button>{message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}</form></div>;
}
