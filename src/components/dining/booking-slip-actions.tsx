'use client';

import { useState } from 'react';

type BookingSlipActionsProps = {
  bookingNumber: string;
  restaurantName: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
};

export default function BookingSlipActions(props: BookingSlipActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const shareText = `${props.restaurantName}\nReservation ${props.bookingNumber}\n${props.roomName}\n${props.bookingDate}, ${props.startTime} to ${props.endTime}\nGuests: ${props.guestCount}\nAmount: ₹${props.amount.toFixed(2)}\nStatus: ${props.bookingStatus}\nPayment: ${props.paymentStatus}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Reservation ${props.bookingNumber}`, text: shareText });
        setMessage('Reservation shared.');
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setMessage('Reservation details copied.');
    } catch {
      setMessage('Sharing is unavailable on this device.');
    }
  }

  function printSlip() {
    window.print();
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={printSlip} className="min-h-11 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">Download / Print Slip</button>
      <button type="button" onClick={share} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Share Reservation</button>
      {message ? <p className="basis-full text-sm text-stone-600" role="status">{message}</p> : null}
    </div>
  );
}
