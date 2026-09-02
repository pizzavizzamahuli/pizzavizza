import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { createRazorpayOrder } from '@/src/services/razorpay-service';
import { updateDiningBooking } from '@/src/models/dining-booking';

export async function POST(_request: Request, context: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { bookingNumber } = await context.params;
    const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.paymentStatus === 'PAID') return NextResponse.json({ success: true, data: { alreadyPaid: true, bookingNumber } });
    if (['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'].includes(booking.bookingStatus)) {
      return NextResponse.json({ error: 'This reservation is not payable.' }, { status: 400 });
    }

    const settings = await getRestaurantSettings();
    if (!settings.onlinePaymentEnabled) return NextResponse.json({ error: 'Online payment is currently unavailable.' }, { status: 400 });
    if (booking.finalAmount <= 0) return NextResponse.json({ error: 'This reservation has no payment amount.' }, { status: 400 });

    let razorpayOrderId = booking.razorpayOrderId;
    if (!razorpayOrderId) {
      const razorpayOrder = await createRazorpayOrder(
        Math.round(booking.finalAmount * 100),
        booking.bookingNumber,
        'INR',
        { bookingNumber: booking.bookingNumber, type: 'dining_reservation' },
      ) as { id?: string };
      if (!razorpayOrder.id) throw new Error('Razorpay did not return an order id.');
      razorpayOrderId = razorpayOrder.id;
      await updateDiningBooking(booking._id!.toHexString(), { razorpayOrderId, paymentMethod: 'ONLINE', paymentStatus: 'PENDING' });
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingNumber: booking.bookingNumber,
        amount: booking.finalAmount,
        razorpayOrderId,
        keyId: process.env.RAZORPAY_KEY_ID || null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start reservation payment.' }, { status: 400 });
  }
}
