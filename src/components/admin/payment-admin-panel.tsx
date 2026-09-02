'use client';

import { useEffect, useState } from 'react';

type PaymentRecord = {
  orderNumber?: string;
  bookingNumber?: string;
  customerSnapshot?: { name?: string };
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  transactionId?: string | null;
  razorpayPaymentId?: string | null;
  walletAmount?: number;
  totalAmount?: number;
  finalAmount?: number;
  discount?: number;
  staffDiscountAmount?: number;
  staffDiscountGiven?: boolean;
  staffDiscountReason?: string | null;
  reservationBookingNumber?: string | null;
};

function isOnline(record: PaymentRecord) {
  return record.paymentMethod === 'ONLINE' || record.paymentMethod === 'MANUAL' || record.paymentMethod === 'WALLET';
}

function DiscountSection({ record, endpoint, onSaved }: { record: PaymentRecord; endpoint: string; onSaved: () => void }) {
  const [given, setGiven] = useState(Boolean(record.staffDiscountGiven));
  const [amount, setAmount] = useState(String(record.staffDiscountAmount || ''));
  const [reason, setReason] = useState(record.staffDiscountReason || '');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveDiscount() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: record.paymentStatus, staffDiscountGiven: given, staffDiscountAmount: Number(amount) || 0, staffDiscountReason: reason }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to save discount');
      setMessage('Discount details saved.');
      onSaved();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to save discount');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-4 border-t border-stone-200 pt-4">
    <p className="text-sm font-semibold text-stone-900">Discount given by staff</p>
    <label className="mt-2 flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={given} onChange={(event) => setGiven(event.target.checked)} /> Discount given</label>
    {given ? <div className="mt-2 grid gap-2 sm:grid-cols-[9rem_1fr_auto]"><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount (₹)" className="rounded-xl border border-stone-200 px-3 py-2 text-sm" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" className="rounded-xl border border-stone-200 px-3 py-2 text-sm" /><button type="button" disabled={saving} onClick={saveDiscount} className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button></div> : <button type="button" disabled={saving} onClick={saveDiscount} className="mt-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Save as no discount</button>}
    {message ? <p className="mt-2 text-xs text-stone-500">{message}</p> : null}
  </div>;
}

function PaymentCard({ record, endpoint, cash, onRefresh }: { record: PaymentRecord; endpoint: string; cash: boolean; onRefresh: () => void }) {
  const identifier = record.orderNumber || record.bookingNumber || '';
  const amount = Number(record.totalAmount ?? record.finalAmount ?? 0);
  const transactionId = record.transactionId || record.razorpayPaymentId;

  async function markReceived() {
    const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentStatus: 'PAID' }) });
    if (!response.ok) return;
    onRefresh();
  }

  async function updateOnlineStatus(paymentStatus: 'PAID' | 'FAILED' | 'SUSPICIOUS') {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus }),
    });
    if (response.ok) onRefresh();
  }

  return <article className="border-b border-stone-200 pb-4 last:border-b-0 last:pb-0">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-stone-900">{identifier}</p><p className="text-sm text-stone-500">{record.customerSnapshot?.name || 'Customer'}</p></div><div className="text-left sm:text-right"><p className="font-semibold text-stone-900">₹{amount.toFixed(2)}</p><p className="text-sm text-stone-500">{record.paymentStatus}</p></div></div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600">{transactionId ? <span>Transaction: {transactionId}</span> : null}{record.walletAmount ? <span>Wallet used: ₹{Number(record.walletAmount).toFixed(2)}</span> : null}{record.discount ? <span>Coupon discount: ₹{Number(record.discount).toFixed(2)}</span> : null}</div>
    {record.paymentProofUrl ? <a href={record.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-amber-700">View payment proof</a> : cash ? null : <p className="mt-2 text-sm text-stone-500">No payment proof uploaded</p>}
    {cash ? <button type="button" onClick={markReceived} disabled={record.paymentStatus === 'PAID'} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Payment Completed</button> : null}
    {!cash ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateOnlineStatus('PAID')} disabled={record.paymentStatus === 'PAID'} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Verify payment</button><button type="button" onClick={() => updateOnlineStatus('FAILED')} disabled={record.paymentStatus === 'FAILED'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reject payment</button><button type="button" onClick={() => updateOnlineStatus('SUSPICIOUS')} disabled={record.paymentStatus === 'SUSPICIOUS'} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Suspicious payment</button>{record.orderNumber ? <a href={`/admin/orders/${record.orderNumber}`} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">View order</a> : null}</div> : null}
    {cash ? <DiscountSection record={record} endpoint={endpoint} onSaved={onRefresh} /> : null}
  </article>;
}

function PaymentGroup({ title, records, cash, onRefresh }: { title: string; records: PaymentRecord[]; cash: boolean; onRefresh: () => void }) {
  return <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><h3 className="font-semibold text-stone-900">{title} <span className="text-sm font-normal text-stone-500">({records.length})</span></h3><div className="mt-4 space-y-4">{records.length ? records.map((record) => <PaymentCard key={record.orderNumber || record.bookingNumber} record={record} endpoint={`/api/admin/${record.orderNumber ? `orders/${record.orderNumber}/payment` : `bookings/${record.bookingNumber}`}`} cash={cash} onRefresh={onRefresh} />) : <p className="text-sm text-stone-500">No payments in this section.</p>}</div></section>;
}

export default function PaymentAdminPanel() {
  const [orders, setOrders] = useState<PaymentRecord[]>([]);
  const [bookings, setBookings] = useState<PaymentRecord[]>([]);
  const [area, setArea] = useState<'BOOKINGS' | 'ORDERS'>('ORDERS');
  const [loading, setLoading] = useState(true);

  async function loadPayments() {
    setLoading(true);
    const [ordersResponse, bookingsResponse] = await Promise.all([fetch('/api/admin/orders'), fetch('/api/admin/bookings')]);
    const ordersJson = await ordersResponse.json();
    const bookingsJson = await bookingsResponse.json();
    setOrders(ordersJson.data || []);
    setBookings(bookingsJson.data || []);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadPayments();
      } catch {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const reservationProducts = orders.filter((order) => Boolean(order.reservationBookingNumber));
  const regularOrders = orders.filter((order) => !order.reservationBookingNumber);
  const records = regularOrders;
  const online = records.filter(isOnline);
  const cash = records.filter((record) => record.paymentMethod === 'COD');
  const productsOnline = reservationProducts.filter(isOnline);
  const productsCash = reservationProducts.filter((record) => record.paymentMethod === 'COD');

  if (loading) return <div>Loading payments...</div>;

  return <div className="space-y-5">
    <div className="flex gap-2 border-b border-stone-200 pb-3"><button type="button" onClick={() => setArea('BOOKINGS')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${area === 'BOOKINGS' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>Bookings</button><button type="button" onClick={() => setArea('ORDERS')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${area === 'ORDERS' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>Orders</button><button type="button" onClick={loadPayments} className="ml-auto rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Refresh</button></div>
    {area === 'BOOKINGS' ? <><PaymentGroup title="Reservation payments - Online payments" records={bookings.filter(isOnline)} cash={false} onRefresh={loadPayments} /><PaymentGroup title="Reservation payments - Cash on Visit" records={bookings.filter((record) => record.paymentMethod === 'COD')} cash onRefresh={loadPayments} /><PaymentGroup title="Reservation products - Online payments" records={productsOnline} cash={false} onRefresh={loadPayments} /><PaymentGroup title="Reservation products - Cash on Visit" records={productsCash} cash onRefresh={loadPayments} /></> : <><PaymentGroup title="Online Payment" records={online} cash={false} onRefresh={loadPayments} /><PaymentGroup title="Cash on Delivery" records={cash} cash onRefresh={loadPayments} /></>}
  </div>;
}
