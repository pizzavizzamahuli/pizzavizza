'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { getFirebaseClientAuth, getOrCreateRecaptchaVerifier, resetRecaptchaVerifier } from '@/src/lib/firebase-client';

type ResetMode = 'EMAIL_ONLY' | 'PHONE_ONLY' | 'EMAIL_OR_PHONE';

type FirebaseResetConfig = {
  enabled: boolean;
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    messagingSenderId: string;
  };
};

type EmailResetResponse = {
  success?: unknown;
  verified?: unknown;
  error?: unknown;
};

async function readEmailResetResponse(response: Response) {
  let data: EmailResetResponse | null = null;
  const body = await response.text();

  if (body) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        data = parsed as EmailResetResponse;
      }
    } catch {
      data = null;
    }
  }

  return { response, data };
}

export function ForgotPasswordForm({ passwordResetOtpMode = 'EMAIL_ONLY', firebase }: { passwordResetOtpMode?: ResetMode; firebase: FirebaseResetConfig }) {
  const router = useRouter();
  const canUseEmail = passwordResetOtpMode !== 'PHONE_ONLY';
  const canUsePhone = passwordResetOtpMode !== 'EMAIL_ONLY';
  const [method, setMethod] = useState<'email' | 'phone'>(canUseEmail ? 'email' : 'phone');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStage, setEmailStage] = useState<'request' | 'verify' | 'password' | 'success'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailSubmitInFlight = useRef(false);
  const phoneSubmitInFlight = useRef(false);

  useEffect(() => {
    if (method !== 'phone') return;
    return () => {
      void resetRecaptchaVerifier();
    };
  }, [method]);

  async function sendEmailResetCode() {
    if (emailSubmitInFlight.current) return;
    emailSubmitInFlight.current = true;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await readEmailResetResponse(response);

      if (!result.response.ok || result.data?.success !== true) {
        setError(typeof result.data?.error === 'string' ? result.data.error : 'Unable to process that request. Please try again.');
        return;
      }

      setEmailStage('verify');
      setEmailCode('');
      setMessage('If an account exists with that email, a reset code has been sent.');
    } catch {
      setError('Unable to process that request. Please try again.');
    } finally {
      emailSubmitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleEmailRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendEmailResetCode();
  }

  async function handleEmailVerificationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailSubmitInFlight.current) return;
    emailSubmitInFlight.current = true;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-email-code', email, code: emailCode }),
      });
      const result = await readEmailResetResponse(response);

      if (!result.response.ok || result.data?.success !== true || result.data.verified !== true) {
        setError(typeof result.data?.error === 'string' ? result.data.error : 'Unable to verify the reset code. Please try again.');
        return;
      }

      setEmailStage('password');
      setMessage('Reset code verified. Choose a new password.');
    } catch {
      setError('Unable to verify the reset code. Please try again.');
    } finally {
      emailSubmitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleEmailPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailSubmitInFlight.current) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    emailSubmitInFlight.current = true;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: emailCode, password: newPassword, confirmPassword }),
      });
      const result = await readEmailResetResponse(response);

      if (!result.response.ok || result.data?.success !== true) {
        setError(typeof result.data?.error === 'string' ? result.data.error : 'Unable to reset your password. Please try again.');
        return;
      }

      setEmailStage('success');
      setEmailCode('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Your password has been reset. You can now sign in.');
    } catch {
      setError('Unable to reset your password. Please try again.');
    } finally {
      emailSubmitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handlePhoneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phoneSubmitInFlight.current) return;
    setError(null);
    setMessage(null);

    if (!firebase.enabled) {
      setError('Phone password reset is not configured yet. Please use email reset or contact support.');
      return;
    }

    phoneSubmitInFlight.current = true;
    setIsSubmitting(true);
    try {
      const auth = getFirebaseClientAuth(firebase.config);
      let confirmation = confirmationResult;
      if (!confirmation) {
        const verifier = getOrCreateRecaptchaVerifier(auth, 'phone-reset-recaptcha');
        confirmation = await signInWithPhoneNumber(auth, mobile.trim(), verifier);
      }
      if (!confirmationResult) {
        setConfirmationResult(confirmation);
        setMessage('OTP sent to your phone. Enter it below to continue.');
        return;
      }
      if (!phoneCode.trim()) {
        setError('Phone OTP is required to continue.');
        return;
      }
      const credential = await confirmation.confirm(phoneCode.trim());
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/forgot/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const responseBody = await response.text();
      let data: { success?: unknown; resetToken?: unknown; error?: unknown } | null = null;
      if (responseBody) {
        try {
          const parsed: unknown = JSON.parse(responseBody);
          if (parsed && typeof parsed === 'object') {
            data = parsed as { success?: unknown; resetToken?: unknown; error?: unknown };
          }
        } catch {
          data = null;
        }
      }
      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : `Phone verification failed (HTTP ${response.status}). Please try again.`,
        );
      }
      if (!data || data.success !== true || (data.resetToken !== null && typeof data.resetToken !== 'string')) {
        throw new Error('Unable to verify phone reset. The server returned an invalid response; please try again.');
      }
      if (!data.resetToken) {
        setMessage('If an account exists with that phone number, reset instructions are available.');
        setMobile('');
        setPhoneCode('');
        setConfirmationResult(null);
        return;
      }
      window.sessionStorage.setItem('pizzavizza_phone_reset_token', data.resetToken);
      router.push('/reset-password?method=phone');
    } catch (phoneError) {
      setError(phoneError instanceof Error ? phoneError.message : 'Unable to verify phone reset.');
    } finally {
      phoneSubmitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Reset password</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Forgot your password?</h1>
      <p className="mt-3 text-sm text-stone-600">{method === 'email' ? emailStage === 'request' ? 'Enter your email and we will send a one-time reset code.' : emailStage === 'verify' ? 'Enter the one-time reset code sent to your email.' : emailStage === 'password' ? 'Choose a new password for your account.' : 'Your password reset is complete.' : 'Enter your registered mobile number and verify it with Firebase SMS OTP.'}</p>

      {canUseEmail && canUsePhone ? (
        <div className="mt-6 grid grid-cols-2 rounded-xl border border-stone-200 bg-stone-50 p-1">
          <button type="button" onClick={() => setMethod('email')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${method === 'email' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-600'}`}>Email OTP</button>
          <button type="button" onClick={() => setMethod('phone')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${method === 'phone' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-600'}`}>Phone OTP</button>
        </div>
      ) : null}

      {method === 'email' ? emailStage === 'success' ? (
        <div className="mt-8 space-y-4">
          {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
          <a href="/login" className="block w-full rounded-full bg-amber-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-amber-700">Sign in</a>
        </div>
      ) : emailStage === 'request' ? <form className="mt-8 space-y-4" onSubmit={handleEmailRequestSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending...' : 'Send reset code'}
        </button>
      </form> : emailStage === 'verify' ? <form className="mt-8 space-y-4" onSubmit={handleEmailVerificationSubmit}>
        {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email-reset-code">Email reset code</label>
          <input
            id="email-reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={emailCode}
            onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying...' : 'Verify OTP'}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => { void sendEmailResetCode(); }}
          className="w-full rounded-full border border-stone-300 px-4 py-3 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Please wait...' : 'Resend reset code'}
        </button>
      </form> : <form className="mt-8 space-y-4" onSubmit={handleEmailPasswordSubmit}>
        {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form> : <form className="mt-8 space-y-4" onSubmit={handlePhoneSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="mobile">Registered mobile number</label>
          <input
            id="mobile"
            type="tel"
            inputMode="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="+91XXXXXXXXXX"
            required
            disabled={Boolean(confirmationResult)}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>
        {confirmationResult ? <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="phone-code">Phone OTP</label>
          <input
            id="phone-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={phoneCode}
            onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div> : null}
        <div id="phone-reset-recaptcha" />

        {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying...' : confirmationResult ? 'Verify OTP' : 'Send phone OTP'}
        </button>
        {confirmationResult ? <button type="button" className="w-full rounded-full border border-stone-300 px-4 py-3 font-semibold text-stone-700 transition hover:bg-stone-50" onClick={() => { setConfirmationResult(null); setPhoneCode(''); setMessage(null); setError(null); }}>
          Use another phone number
        </button> : null}
      </form>}

      <p className="mt-6 text-sm text-stone-600">
        Remembered your password? <a href="/login" className="font-semibold text-amber-600">Sign in</a>
      </p>
    </div>
  );
}
