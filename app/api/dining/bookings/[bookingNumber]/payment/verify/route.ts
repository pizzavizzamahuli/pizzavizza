import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { updateDiningBooking } from '@/src/models/dining-booking';
import { verifyRazorpaySignature } from '@/src/services/razorpay-service';

export async function POST(request: Request, context: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { bookingNumber } = await context.params;
    const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const payload = await request.json() as { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string };
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification details.' }, { status: 400 });
    }
    if (!booking.razorpayOrderId || booking.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment order does not match this reservation.' }, { status: 400 });
    }

    const valid = await verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      await updateDiningBooking(booking._id!.toHexString(), { paymentStatus: 'FAILED' });
      return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
    }

    const updated = await updateDiningBooking(booking._id!.toHexString(), {
      paymentMethod: 'ONLINE',
      paymentStatus: 'PAID',
      razorpayPaymentId,
      razorpaySignature,
    });
    return NextResponse.json({ success: true, data: { bookingNumber: updated?.bookingNumber, paymentStatus: updated?.paymentStatus } });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to verify reservation payment.' }, { status: 400 });
  }
}
