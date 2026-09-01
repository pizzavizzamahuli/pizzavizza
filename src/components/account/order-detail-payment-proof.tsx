'use client';

import React, { useState } from 'react';

interface Props {
  orderNumber: string;
  paymentStatus: string;
  paymentProofUrl?: string | null;
}

export default function OrderDetailPaymentProof({ orderNumber, paymentStatus, paymentProofUrl }: Props) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  async function uploadProof() {
    if (!proofFile) {
      setMessage('Please choose a payment proof image.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('proof', proofFile);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            setUploadStatus('success');
            resolve();
            return;
          }

          try {
            const json = JSON.parse(xhr.responseText || '{}');
            reject(new Error(json?.error || 'Failed to upload proof'));
          } catch {
            reject(new Error('Failed to upload proof'));
          }
        });

        xhr.addEventListener('error', () => {
          setUploadStatus('error');
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          setUploadStatus('error');
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', `/api/account/orders/${orderNumber}/payment-proof`);
        xhr.send(formData);
      });

      setMessage('Payment Proof uploaded successfully. It will be verified shortly.');
      setProofFile(null);
      setUploadStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus('error');
      setMessage(msg || 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  if (paymentStatus === 'AWAITING_VERIFICATION') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-700">Payment verification pending</p>
        <p className="text-sm text-amber-700">Your payment proof has already been submitted and is awaiting review.</p>
      </div>
    );
  }

  if (paymentStatus === 'PAID') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700">
        Payment received. Thank you.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Upload Payment Proof</h2>
      <p className="mt-2 text-sm text-stone-600">Upload a clear photo or screenshot of your payment proof.</p>
      <div className="mt-4">
        <label className="block text-sm font-medium text-stone-700">Payment Proof</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setProofFile(e.target.files?.[0] ?? null);
            setUploadProgress(0);
            setUploadStatus('idle');
            setMessage(null);
          }}
          className="mt-2 w-full rounded border px-3 py-2"
        />
      </div>

      {proofFile && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-900">{proofFile.name}</p>
              <p className="text-xs text-stone-500">{(proofFile.size / 1024).toFixed(2)} KB</p>
            </div>
            {uploadStatus === 'success' && <span className="text-lg text-emerald-600">✓</span>}
            {uploadStatus === 'error' && <span className="text-lg text-red-600">✗</span>}
          </div>

          {uploadStatus === 'uploading' && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-stone-600">
                <span>Uploading...</span>
                <span className="font-medium text-stone-700">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-amber-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button onClick={uploadProof} disabled={saving || !proofFile} className="rounded bg-amber-600 px-4 py-2 text-white disabled:opacity-60">
          {saving ? 'Uploading…' : 'Submit proof'}
        </button>
        {paymentProofUrl && <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-600">View existing proof</a>}
      </div>
      {message && <div className="mt-3 text-sm text-stone-700">{message}</div>}
    </div>
  );
}
