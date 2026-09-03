import crypto from 'crypto';
import { env } from '@/src/config/env';
import { getSecret } from '@/src/services/secret-service';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

async function getAuthHeader() {
  const keyId = env.RAZORPAY_KEY_ID || null;
  const keySecret = await getSecret('razorpayKeySecret');
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return `Basic ${token}`;
}

export async function createRazorpayOrder(amountInPaise: number, receipt: string, currency = 'INR', notes?: Record<string, string>) {
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) throw new Error('Invalid amount for Razorpay order');
  const url = `${RAZORPAY_API_BASE}/orders`;
  const body: Record<string, unknown> = {
    amount: Math.round(amountInPaise),
    currency,
    receipt,
    payment_capture: 1,
  };
  if (notes) body.notes = notes;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: await getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Razorpay create order failed: ${res.status} ${txt}`);
  }

  return res.json();
}

export async function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
  const keySecret = await getSecret('razorpayKeySecret');
  if (!keySecret) throw new Error('Razorpay key secret not configured');
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
  return expected === razorpaySignature;
}

export async function getRazorpayOrder(razorpayOrderId: string) {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders/${encodeURIComponent(razorpayOrderId)}`, {
    headers: { Authorization: await getAuthHeader() },
  });
  if (!response.ok) throw new Error(`Razorpay order lookup failed: ${response.status}`);
  return response.json() as Promise<{ id?: string; amount?: number; currency?: string }>;
}
