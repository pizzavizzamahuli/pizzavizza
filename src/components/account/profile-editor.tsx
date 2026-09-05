'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ProfileUser = {
  name: string;
  email: string;
  mobile?: string | null;
  role: string;
};

function roleLabel(role: string) {
  return role === 'CUSTOMER' ? 'Consumer' : role.replaceAll('_', ' ');
}

export default function ProfileEditor({ user, userCode }: { user: ProfileUser; userCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setOpen(false);
    setStep('form');
    setCode('');
    setMessage(null);
    setError(null);
  }

  async function requestVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile: mobile || null }),
      });
      const data = await response.json() as { error?: string; message?: string; requiresVerification?: boolean };
      if (!response.ok) throw new Error(data.error || 'Unable to update profile.');
      if (!data.requiresVerification) {
        setMessage('Profile updated successfully.');
        router.refresh();
        return;
      }
      setStep('verify');
      setMessage(data.message || 'Verification code sent to your current verified email.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to verify profile update.');
      setMessage('Profile updated successfully.');
      router.refresh();
      setTimeout(close, 500);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify profile update.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">
        Edit profile
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">My account</p><h2 id="profile-editor-title" className="mt-2 text-2xl font-semibold text-stone-900">{step === 'form' ? 'Edit profile' : 'Security verification'}</h2></div>
              <button type="button" onClick={close} className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600">Close</button>
            </div>
            {step === 'form' ? (
              <form className="mt-6 space-y-4" onSubmit={requestVerification}>
                <div><label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-stone-700">Full name</label><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2.5" /></div>
                <div><label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-stone-700">Email address</label><input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2.5" /></div>
                <div><label htmlFor="profile-mobile" className="mb-1 block text-sm font-medium text-stone-700">Mobile number</label><input id="profile-mobile" inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5" /><p className="mt-1 text-xs text-stone-500">Mobile changes are authorized with a code sent to your current verified email.</p></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Permanent User ID</p><p className="mt-1 font-mono font-semibold">{userCode}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Role</p><p className="mt-1 font-semibold">{roleLabel(user.role)}</p></div></div>
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-700">Sensitive changes send a one-time code to your current verified email.</p>
                {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
                {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
                <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Cancel</button><button type="submit" disabled={busy} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Sending...' : 'Continue'}</button></div>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={verifyAndSave}>
                <p className="text-sm text-stone-600">We sent a six-digit verification code to your current verified email. The code expires in 15 minutes.</p>
                <div><label htmlFor="profile-code" className="mb-1 block text-sm font-medium text-stone-700">Verification code</label><input id="profile-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required className="w-full rounded-xl border border-stone-300 px-3 py-2.5 tracking-[0.35em]" /></div>
                {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
                {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
                <div className="flex justify-between gap-2"><button type="button" onClick={() => setStep('form')} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Back</button><button type="submit" disabled={busy} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Verifying...' : 'Verify & save'}</button></div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
