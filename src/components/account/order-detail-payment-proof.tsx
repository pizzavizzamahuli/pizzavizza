/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';

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
  const proofPreview = proofFile ? URL.createObjectURL(proofFile) : null;

  useEffect(() => () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  function selectProof(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      return;
    }
    setProofFile(file);
    setUploadProgress(0);
    setUploadStatus('idle');
    setMessage(null);
  }

  function removeProof() {
    setProofFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setMessage(null);
  }

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
        xhr.withCredentials = true;
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
        <div
          className="mt-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-5 text-center hover:border-amber-500"
          onDrop={(event) => { event.preventDefault(); selectProof(event.dataTransfer.files?.[0]); }}
          onDragOver={(event) => event.preventDefault()}
        >
          <input id="payment-proof-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => { selectProof(event.target.files?.[0]); event.target.value = ''; }} />
          <p className="text-sm text-stone-600">Drag and drop your proof here</p>
          <label htmlFor="payment-proof-picker" className="mt-3 inline-flex cursor-pointer rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Choose image from device</label>
          <p className="mt-2 text-xs text-stone-500">Use a clear JPG, PNG, or screenshot.</p>
        </div>
      </div>

      {proofFile && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          {proofPreview ? <img src={proofPreview} alt="Selected payment proof" className="mb-3 h-40 w-full rounded-xl object-contain bg-white" /> : null}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-900">{proofFile.name}</p>
              <p className="text-xs text-stone-500">{(proofFile.size / 1024).toFixed(2)} KB</p>
            </div>
            {uploadStatus === 'success' && <span className="text-lg text-emerald-600">✓</span>}
            {uploadStatus === 'error' && <span className="text-lg text-red-600">✗</span>}
            <button type="button" onClick={removeProof} disabled={saving} className="text-sm font-semibold text-stone-600 hover:text-red-600 disabled:opacity-50">Remove</button>
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
