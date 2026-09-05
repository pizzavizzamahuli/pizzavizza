'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import GoogleMapsActions from '@/src/components/admin/google-maps-actions';
import DeliveryShareActions from '@/src/components/admin/delivery-share-actions';

type AnyRecord = Record<string, any>;
type OperationsData = {
  orders: AnyRecord[];
  bookings: AnyRecord[];
  staff: AnyRecord[];
  storeLocation: { latitude: number; longitude: number } | null;
  restaurantName: string;
};

const FILTERS = ['ALL', 'NEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RESERVATIONS'];
const STATUS_LABELS: Record<string, string> = { PENDING: 'NEW', CONFIRMED: 'CONFIRMED', PREPARING: 'PREPARING', READY: 'READY', OUT_FOR_DELIVERY: 'OUT FOR DELIVERY', DELIVERED: 'DELIVERED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED', REJECTED: 'CANCELLED' };
const NEXT_ORDER_STATUSES: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'], CONFIRMED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY', 'CANCELLED'], READY: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], PICKED_UP: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], OUT_FOR_DELIVERY: ['DELIVERED'], DELIVERED: ['COMPLETED'] };

function orderStatus(order: AnyRecord) {
  if (order.paymentStatus === 'AWAITING_VERIFICATION') return 'PAYMENT_VERIFICATION';
  if (order.paymentStatus === 'PENDING' && order.paymentMethod !== 'COD') return 'PAYMENT_PENDING';
  if (order.deliveryStaffId && order.orderStatus === 'READY') return 'ASSIGNED';
  return order.orderStatus === 'PENDING' ? 'NEW' : STATUS_LABELS[order.orderStatus] || order.orderStatus;
}

function whatsappText(order: AnyRecord, restaurantName: string, storeLocation: OperationsData['storeLocation']) {
  const address = order.deliveryAddress;
  const navigation = address && typeof address.latitude === 'number' && typeof address.longitude === 'number'
    ? `https://www.google.com/maps/dir/?api=1&origin=${storeLocation ? `${storeLocation.latitude},${storeLocation.longitude}` : ''}&destination=${address.latitude},${address.longitude}`
    : '';
  const items = (order.items || []).map((item: AnyRecord) => `${item.name} x ${item.quantity}`).join(', ');
  return [restaurantName, `Order: ${order.orderNumber}`, `Customer: ${order.customerSnapshot?.name || ''}`, `Phone: ${order.customerSnapshot?.mobile || ''}`, `Type: ${order.fulfillmentType}`, `Address: ${address ? `${address.addressLine1}, ${address.city}, ${address.state} ${address.postalCode}` : 'Pickup'}`, navigation ? `Navigation: ${navigation}` : '', `Items: ${items}`, `Total: ₹${Number(order.totalAmount || 0).toFixed(2)}`, `Payment: ${order.paymentMethod || 'COD'} (${order.paymentStatus})`, `Delivery staff: ${order.deliveryStaffName || 'Unassigned'}`, `Status: ${order.orderStatus}`].filter(Boolean).join('\n');
}

export default function OperationsCenter() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState<AnyRecord | null>(null);
  const [kind, setKind] = useState<'order' | 'booking'>('order');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/operations', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load operations');
      setData(json.data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load operations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() => undefined);
  }, []);

  const visibleOrders = useMemo(() => (data?.orders || []).filter((order) => {
    const searchText = `${order.orderNumber} ${order.customerSnapshot?.name || ''} ${order.customerSnapshot?.mobile || ''} ${order.deliveryStaffName || ''}`.toLowerCase();
    return (!search || searchText.includes(search.toLowerCase())) && (!date || String(order.createdAt || '').slice(0, 10) === date) && (filter === 'ALL' || (filter !== 'RESERVATIONS' && orderStatus(order) === filter));
  }), [data, filter, search, date]);

  const visibleBookings = useMemo(() => (data?.bookings || []).filter((booking) => {
    const searchText = `${booking.bookingNumber} ${booking.customerSnapshot?.name || ''} ${booking.customerSnapshot?.mobile || ''}`.toLowerCase();
    return (filter === 'ALL' || filter === 'RESERVATIONS') && (!search || searchText.includes(search.toLowerCase())) && (!date || booking.bookingDate === date);
  }), [data, filter, search, date]);

  async function update(url: string, payload: AnyRecord) {
    const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Update failed');
    setNotice('Updated successfully.');
    await reload();
    setSelected(null);
  }

  const orders = data?.orders || [];
  const bookings = data?.bookings || [];
  const counters = {
    newOrders: orders.filter((order) => order.orderStatus === 'PENDING').length,
    pendingPayments: orders.filter((order) => ['PENDING', 'AWAITING_VERIFICATION'].includes(order.paymentStatus)).length,
    unassigned: orders.filter((order) => order.fulfillmentType === 'DELIVERY' && !order.deliveryStaffId && !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.orderStatus)).length,
    active: orders.filter((order) => ['READY', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)).length,
    pendingBookings: bookings.filter((booking) => booking.bookingStatus === 'PENDING').length,
  };

  if (loading && !data) return <div className="rounded-2xl border bg-white p-8">Loading operations...</div>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Central operations</p><h1 className="mt-1 text-3xl font-semibold">Order Management Center</h1><p className="mt-2 text-sm text-stone-600">Orders, payments, delivery and reservations in one workspace.</p></div><button type="button" onClick={() => reload()} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">Refresh</button></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['New Orders', counters.newOrders], ['Pending Payments', counters.pendingPayments], ['Unassigned Deliveries', counters.unassigned], ['Active Deliveries', counters.active], ['Pending Bookings', counters.pendingBookings]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-4"><p className="text-xs font-semibold uppercase text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
    <div className="rounded-2xl border bg-white p-4"><div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, mobile or staff" className="rounded-xl border px-4 py-3" /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border px-4 py-3" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border px-4 py-3">{FILTERS.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div></div>
    {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    <div className="grid gap-4">{visibleOrders.map((order) => <button type="button" key={order.orderNumber} onClick={() => { setSelected(order); setKind('order'); }} className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-amber-400"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{order.orderNumber}</p><p className="mt-1 text-sm text-stone-600">{order.customerSnapshot?.name} • {order.fulfillmentType}</p></div><div className="text-right"><p className="font-semibold">₹{Number(order.totalAmount || 0).toFixed(2)}</p><p className="mt-1 text-xs font-semibold text-amber-700">{orderStatus(order)}</p></div></div><p className="mt-3 text-sm text-stone-500">Payment: {order.paymentMethod || 'COD'} / {order.paymentStatus}{order.deliveryStaffName ? ` • Staff: ${order.deliveryStaffName}` : ''}</p></button>)}{visibleBookings.map((booking) => <button type="button" key={booking.bookingNumber} onClick={() => { setSelected(booking); setKind('booking'); }} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left"><p className="font-semibold">{booking.bookingNumber}</p><p className="mt-1 text-sm">{booking.customerSnapshot?.name} • {booking.roomSnapshot?.name}</p><p className="mt-1 text-sm text-stone-600">{booking.bookingDate} • {booking.startTime} - {booking.endTime} • {booking.bookingStatus}</p></button>)}{visibleOrders.length === 0 && visibleBookings.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-stone-500">No matching operations.</div> : null}</div>
    {selected ? <div className="fixed inset-0 z-50 bg-stone-950/40" onClick={() => setSelected(null)}><aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-stone-50 p-5 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">{kind === 'order' ? 'Order operations' : 'Reservation operations'}</p><h2 className="mt-2 text-2xl font-semibold">{selected.orderNumber || selected.bookingNumber}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-full border px-3 py-2">Close</button></div>{kind === 'order' && selected.fulfillmentType === 'DELIVERY' && selected.orderStatus === 'READY' && !selected.deliveryStaffId ? <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold text-amber-900">Assign Delivery Staff</h3><p className="mt-1 text-sm text-amber-800">This READY delivery is waiting for assignment.</p>{data?.staff?.length ? <select defaultValue="" onChange={(event) => { const staff = data.staff.find((person) => person.id === event.target.value); if (staff) update(`/api/admin/orders/${selected.orderNumber}/assignment`, { staffId: staff.id }); }} className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-3 py-2"><option value="">Select delivery staff</option>{data.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} ({staff.accountStatus})</option>)}</select> : <p className="mt-3 text-sm font-medium text-amber-900">No eligible delivery staff is currently available.</p>}</section> : null}<OperationDetail data={data} selected={selected} kind={kind} update={update} /></aside></div> : null}
  </div>;
}

function OperationDetail({ data, selected, kind, update }: { data: OperationsData | null; selected: AnyRecord; kind: 'order' | 'booking'; update: (url: string, payload: AnyRecord) => Promise<void> }) {
  if (kind === 'booking') return <section className="mt-6 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Booking details</h3><p className="mt-3 text-sm">{selected.customerSnapshot?.name} • {selected.customerSnapshot?.mobile || 'No mobile'}</p><p className="mt-1 text-sm">{selected.roomSnapshot?.name} • {selected.bookingDate} • {selected.startTime} - {selected.endTime}</p><p className="mt-1 text-sm">Guests: {selected.guestCount} • Rooms: {selected.roomCount} • ₹{Number(selected.finalAmount || 0).toFixed(2)}</p><p className="mt-1 text-sm">Status: {selected.bookingStatus} • Payment: {selected.paymentStatus}</p>{selected.paymentProofUrl ? <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white">View payment proof</a> : null}<div className="mt-4 flex flex-wrap gap-2">{['CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'].map((status) => <button key={status} type="button" onClick={() => update(`/api/admin/bookings/${selected.bookingNumber}`, { status })} className="rounded-full border px-3 py-2 text-xs font-semibold">{status}</button>)}{['PAID', 'PENDING', 'FAILED', 'REFUNDED'].map((paymentStatus) => <button key={paymentStatus} type="button" onClick={() => update(`/api/admin/bookings/${selected.bookingNumber}`, { paymentStatus })} className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Payment {paymentStatus}</button>)}<a href={`https://wa.me/?text=${encodeURIComponent(`Pizza Vizza reservation ${selected.bookingNumber} for ${selected.customerSnapshot?.name}`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">WhatsApp</a></div></section>;
  const address = selected.deliveryAddress;
  return <><section className="mt-6 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Order and customer</h3><p className="mt-3 text-sm">{selected.customerSnapshot?.name} • {selected.customerSnapshot?.mobile || 'No mobile'}</p><p className="mt-1 text-sm text-stone-600">{selected.fulfillmentType} • {selected.orderStatus} • {new Date(selected.createdAt).toLocaleString()}</p><ul className="mt-4 space-y-2 text-sm">{(selected.items || []).map((item: AnyRecord) => <li key={`${item.productId}-${item.name}`} className="flex justify-between border-b pb-2"><span>{item.name} × {item.quantity}</span><span>₹{Number(item.subtotal || 0).toFixed(2)}</span></li>)}</ul><p className="mt-4 text-right text-lg font-semibold">₹{Number(selected.totalAmount || 0).toFixed(2)}</p></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Payment</h3><p className="mt-2 text-sm">{selected.paymentMethod || 'COD'} • {selected.paymentStatus} • Wallet: ₹{Number(selected.walletAmount || 0).toFixed(2)}</p>{selected.paymentProofUrl ? <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">View payment proof</a> : null}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => update(`/api/admin/orders/${selected.orderNumber}/payment`, { paymentStatus: 'PAID' })} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Verify payment</button><button type="button" onClick={() => update(`/api/admin/orders/${selected.orderNumber}/payment`, { paymentStatus: 'FAILED' })} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Reject payment</button><button type="button" onClick={() => update(`/api/admin/orders/${selected.orderNumber}/payment`, { paymentStatus: 'REFUNDED' })} className="rounded-full border px-4 py-2 text-sm font-semibold">Mark refunded</button></div></section>{selected.fulfillmentType === 'DELIVERY' && address ? <section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Delivery and communication</h3><p className="mt-3 text-sm">{address.addressLine1}, {address.city}, {address.state} {address.postalCode}</p><p className="mt-1 text-xs text-stone-500">Coordinates: {address.latitude ?? 'N/A'}, {address.longitude ?? 'N/A'}</p><GoogleMapsActions storeLocation={data?.storeLocation || null} customerLocation={typeof address.latitude === 'number' && typeof address.longitude === 'number' ? { latitude: address.latitude, longitude: address.longitude } : null} /><div className="mt-4"><DeliveryShareActions message={whatsappText(selected, data?.restaurantName || 'Pizza Vizza', data?.storeLocation || null)} /></div></section> : null}{data?.staff?.length ? <section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Delivery staff</h3><select defaultValue={selected.deliveryStaffId || ''} onChange={(event) => { const staff = data.staff.find((person) => person.id === event.target.value); update(`/api/admin/orders/${selected.orderNumber}/assignment`, { staffId: staff?.id || null }).catch(() => undefined); }} className="mt-3 w-full rounded-xl border px-3 py-2"><option value="">Unassigned</option>{data.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}{staff.mobile ? ` • ${staff.mobile}` : ''}</option>)}</select></section> : null}<section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Order status</h3><div className="mt-3 flex flex-wrap gap-2">{(NEXT_ORDER_STATUSES[selected.orderStatus] || []).map((status) => <button key={status} type="button" onClick={() => update(`/api/admin/orders/${selected.orderNumber}/status`, { status })} className="rounded-full border px-3 py-2 text-xs font-semibold">{status.replaceAll('_', ' ')}</button>)}</div></section></>;
}
