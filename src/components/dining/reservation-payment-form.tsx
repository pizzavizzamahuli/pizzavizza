'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };
type RazorpayWindow = Window & { Razorpay?: RazorpayConstructor };

type Props = {
  bookingNumber: string;
  amount: number;
  razorpayEnabled: boolean;
  manualPaymentEnabled: boolean;
  manualPaymentUpiId?: string | null;
  manualPaymentQrUrl?: string | null;
  manualPaymentBankDetails?: string | null;
};

export default function ReservationPaymentForm({ bookingNumber, amount, razorpayEnabled, manualPaymentEnabled, manualPaymentUpiId, manualPaymentQrUrl, manualPaymentBankDetails }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!proofFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProofPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(proofFile);
    setProofPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [proofFile]);

  function selectProof(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Please choose an image up to 5 MB.');
      return;
    }
    setProofFile(file);
    setError(null);
  }

  async function submitManualProof() {
    if (!proofFile) {
      setError('Please upload your payment screenshot.');
      return;
    }
    if (!transactionId.trim()) {
      setError('Please enter the transaction ID.');
      return;
    }
    setUploadingProof(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('proof', proofFile);
      body.append('transactionId', transactionId.trim());
      const response = await fetch(`/api/account/bookings/${encodeURIComponent(bookingNumber)}/payment-proof`, { method: 'POST', credentials: 'include', body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Payment proof upload failed.');
      setMessage('Payment proof submitted. The restaurant will verify it shortly.');
      setProofFile(null);
      setTransactionId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment proof upload failed.');
    } finally {
      setUploadingProof(false);
    }
  }

  async function payNow() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/dining/bookings/${encodeURIComponent(bookingNumber)}/payment`, { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to start payment.');
      if (json.data?.alreadyPaid) {
        router.push(`/account/bookings/${encodeURIComponent(bookingNumber)}`);
        return;
      }
      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!Razorpay || !json.data?.keyId) throw new Error('Online payment is not configured correctly.');
      new Razorpay({
        key: json.data.keyId,
        amount: Math.round(Number(json.data.amount) * 100),
        currency: 'INR',
        name: 'Pizza Vizza',
        description: `Reservation ${bookingNumber}`,
        order_id: json.data.razorpayOrderId,
        theme: { color: '#d97706' },
        handler: async (payment: RazorpayResponse) => {
          const verifyResponse = await fetch(`/api/dining/bookings/${encodeURIComponent(bookingNumber)}/payment/verify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment),
          });
          const verifyJson = await verifyResponse.json();
          if (!verifyResponse.ok) throw new Error(verifyJson.error || 'Payment verification failed.');
          router.push(`/account/bookings/${encodeURIComponent(bookingNumber)}`);
        },
      }).open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 p-4 text-center"><p className="text-sm text-amber-800">Reservation amount</p><p className="mt-1 text-3xl font-semibold text-stone-900">₹{amount.toFixed(2)}</p></div>
      {razorpayEnabled ? <button type="button" onClick={payNow} disabled={loading} className="min-h-12 w-full rounded-full bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{loading ? 'Opening payment...' : 'Pay reservation amount'}</button> : null}
      {manualPaymentEnabled ? <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"><p className="font-semibold text-stone-900">Manual payment details</p>{manualPaymentUpiId ? <p className="mt-2">UPI ID: {manualPaymentUpiId}</p> : null}{manualPaymentBankDetails ? <p className="mt-2 whitespace-pre-line">{manualPaymentBankDetails}</p> : null}{manualPaymentQrUrl ? <img src={manualPaymentQrUrl} alt="Payment QR code" className="mt-3 h-48 w-48 object-contain" /> : null}<p className="mt-3 text-xs text-stone-500">Pay the reservation amount using the details above, then submit your transaction ID and payment screenshot for admin verification.</p><label className="mt-4 block text-sm font-medium text-stone-700">Transaction ID<input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Enter UPI / bank transaction ID" className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2" /></label><div className="mt-4"><span className="block text-sm font-medium text-stone-700">Payment proof</span><div className="mt-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-5 text-center" onDrop={(event) => { event.preventDefault(); selectProof(event.dataTransfer.files?.[0]); }} onDragOver={(event) => event.preventDefault()}><input id="reservation-payment-proof" type="file" accept="image/*" className="sr-only" onChange={(event) => { selectProof(event.target.files?.[0]); event.target.value = ''; }} /><label htmlFor="reservation-payment-proof" className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">Choose image from device</label><p className="mt-2 text-xs text-stone-500">Or drag and drop your payment screenshot here. Maximum 5 MB.</p>{proofFile ? <p className="mt-2 text-xs font-medium text-stone-700">{proofFile.name}</p> : null}</div>{proofPreview ? <img src={proofPreview} alt="Payment proof preview" className="mt-3 h-40 w-full rounded-xl bg-white object-contain" /> : null}</div><button type="button" onClick={submitManualProof} disabled={uploadingProof} className="mt-4 min-h-11 w-full rounded-full bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{uploadingProof ? 'Submitting proof...' : 'Submit payment proof'}</button></div> : null}
      {!razorpayEnabled && !manualPaymentEnabled ? <p className="text-sm text-red-600">No reservation payment method is currently enabled.</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
