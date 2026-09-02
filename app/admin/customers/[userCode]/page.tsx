import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminAccess } from '@/src/auth/guard';
import { findUserByUserCode } from '@/src/models/user';
import { listOrders } from '@/src/models/order';
import { listDiningBookings } from '@/src/models/dining-booking';
import { getWalletBalance, getWalletLedger } from '@/src/models/wallet';
import { ensureUserCode } from '@/src/services/user-service';

export default async function AdminCustomerDetailsPage({ params }: { params: Promise<{ userCode: string }> }) {
  const admin = await requireAdminAccess();
  const { userCode } = await params;
  const customer = await findUserByUserCode(userCode);
  if (!customer || (admin.role !== 'MAIN_ADMIN' && customer.role !== 'CUSTOMER')) return notFound();

  const id = customer._id?.toHexString() || customer.id || '';
  const [orders, bookings, walletBalance, walletLedger] = await Promise.all([
    listOrders({ userId: id }),
    listDiningBookings({ userId: id }),
    getWalletBalance(id),
    getWalletLedger(id),
  ]);
  const compactId = await ensureUserCode(customer);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = bookings.filter((booking) => booking.bookingDate >= today && !['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'].includes(booking.bookingStatus));
  const previousBookings = bookings.filter((booking) => !upcomingBookings.includes(booking));

  return <div className="space-y-6">
    <Link href="/admin/customers" className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">Back to customers</Link>
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Customer profile</p><h1 className="mt-2 text-3xl font-semibold">{customer.name}</h1><p className="mt-2 text-sm text-stone-600">User ID: <strong>{compactId}</strong> • {customer.role}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{customer.accountStatus}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-xs uppercase text-stone-500">Email</p><p className="mt-1 text-sm">{customer.email}</p></div><div><p className="text-xs uppercase text-stone-500">Phone</p><p className="mt-1 text-sm">{customer.mobile || 'Not provided'}</p></div><div><p className="text-xs uppercase text-stone-500">Wallet</p><p className="mt-1 text-sm font-semibold">₹{walletBalance.toFixed(2)}</p></div></div></section>
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Orders and payments</h2>{orders.length ? <div className="mt-4 space-y-3">{orders.map((order) => <div key={order.orderNumber} className="rounded-2xl bg-stone-50 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-stone-600">{order.createdAt.toLocaleString()} • {order.orderStatus}</p></div><div className="text-right"><p className="font-semibold">₹{order.totalAmount.toFixed(2)}</p><p className="text-sm text-stone-600">{order.paymentMethod || 'COD'} • {order.paymentStatus}</p></div></div>{order.walletAmount > 0 ? <p className="mt-2 text-xs text-stone-500">Wallet used: ₹{order.walletAmount.toFixed(2)}{order.couponCode ? ` • Coupon: ${order.couponCode}` : ''}</p> : null}</div>)}</div> : <p className="mt-3 text-sm text-stone-500">No orders or payments found.</p>}</section>
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Upcoming bookings</h2>{upcomingBookings.length ? <div className="mt-4 space-y-3">{upcomingBookings.map((booking) => <div key={booking.bookingNumber} className="rounded-2xl bg-amber-50 p-4"><p className="font-semibold">{booking.bookingNumber} • {booking.roomSnapshot.name}</p><p className="mt-1 text-sm">{booking.bookingDate} • {booking.startTime} - {booking.endTime} • {booking.bookingStatus}</p><p className="mt-1 text-sm">Payment: {booking.paymentStatus} • ₹{booking.finalAmount.toFixed(2)}</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No upcoming bookings.</p>}<h2 className="mt-6 text-xl font-semibold">Previous bookings</h2>{previousBookings.length ? <div className="mt-4 space-y-3">{previousBookings.map((booking) => <div key={booking.bookingNumber} className="rounded-2xl bg-stone-50 p-4"><p className="font-semibold">{booking.bookingNumber} • {booking.roomSnapshot.name}</p><p className="mt-1 text-sm">{booking.bookingDate} • {booking.bookingStatus} • Payment: {booking.paymentStatus}</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No previous bookings.</p>}</section>
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Wallet activity</h2>{walletLedger.length ? <div className="mt-4 space-y-2">{walletLedger.slice(0, 20).map((entry) => <div key={entry._id?.toHexString()} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{entry.reason}</span><span className={entry.amount < 0 ? 'text-red-700' : 'text-emerald-700'}>{entry.amount < 0 ? '-' : '+'}₹{Math.abs(entry.amount).toFixed(2)}</span></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No wallet activity.</p>}</section>
  </div>;
}
