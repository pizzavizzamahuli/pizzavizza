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

  function downloadImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 700;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#fafaf9'; context.fillRect(0, 0, 900, 700); context.fillStyle = '#1c1917'; context.font = '700 34px Arial'; context.fillText(props.restaurantName, 60, 70); context.font = '700 24px Arial'; context.fillText('RESERVATION CONFIRMATION', 60, 120); context.font = '20px Arial'; context.fillText(`Booking: ${props.bookingNumber}`, 60, 175); context.fillText(`Room: ${props.roomName}`, 60, 215); context.fillText(`${props.bookingDate} · ${props.startTime} to ${props.endTime}`, 60, 255); context.fillText(`Guests: ${props.guestCount}`, 60, 295); context.fillText(`Amount: INR ${props.amount.toFixed(2)}`, 60, 335); context.fillText(`Status: ${props.bookingStatus}`, 60, 375); context.fillText(`Payment: ${props.paymentStatus}`, 60, 415); context.fillStyle = '#78716c'; context.font = '18px Arial'; context.fillText('Thank you for booking with Pizza Vizza!', 60, 500); const link = document.createElement('a'); link.download = `${props.bookingNumber}-confirmation.png`; link.href = canvas.toDataURL('image/png'); link.click(); setMessage('Reservation image downloaded.');
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={printSlip} className="min-h-11 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">Download / Print Slip</button>
      <button type="button" onClick={downloadImage} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Download Image</button>
      <button type="button" onClick={share} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Share Reservation</button>
      {message ? <p className="basis-full text-sm text-stone-600" role="status">{message}</p> : null}
    </div>
  );
}
