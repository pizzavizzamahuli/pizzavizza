'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailVerificationButton({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'verify'>('idle');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to send verification code.');
      setStep('verify');
      setMessage('Verification code sent to your email.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send verification code.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Invalid verification code.');
      setMessage('Email verified successfully.');
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify email.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'idle') {
    return <button type="button" onClick={sendCode} disabled={busy} className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60">{busy ? 'Sending...' : 'Verify email'}</button>;
  }

  return (
    <form onSubmit={verifyCode} className="flex flex-wrap items-center justify-end gap-2">
      <input aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="6-digit code" className="w-28 rounded-lg border border-stone-300 px-2 py-1 text-xs" />
      <button type="submit" disabled={busy} className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">{busy ? 'Checking...' : 'Confirm'}</button>
      {message ? <span className="w-full text-right text-xs text-emerald-700">{message}</span> : null}
      {error ? <span className="w-full text-right text-xs text-rose-700">{error}</span> : null}
    </form>
  );
}
