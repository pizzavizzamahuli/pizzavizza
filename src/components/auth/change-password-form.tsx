'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || 'Unable to change password.');
      return;
    }

    setMessage('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Change password</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Update your password</h1>
      <p className="mt-3 text-sm text-stone-600">Use your current password to set a new one.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
        </div>

        {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
