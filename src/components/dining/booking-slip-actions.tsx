'use client';

import { useState } from 'react';

type BookingSlipActionsProps = {
  bookingNumber: string;
  restaurantName: string;
  restaurantLogo?: string | null;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
};

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = src;
    image.crossOrigin = 'anonymous';
  });
}

async function createReservationImage(props: BookingSlipActionsProps): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 900 * 2;
  canvas.height = 740 * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Reservation image is unavailable.');
  context.scale(2, 2);
  context.fillStyle = '#fafaf9';
  context.fillRect(0, 0, 900, 740);
  if (props.restaurantLogo) {
    try {
      const logo = await loadImage(props.restaurantLogo);
      const size = 54;
      context.save();
      context.beginPath();
      context.arc(62 + size / 2, 62 + size / 2, size / 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      context.drawImage(logo, 62, 62, size, size);
      context.restore();
    } catch {
      context.fillStyle = '#f59e0b';
      context.fillRect(62, 62, 54, 54);
      context.fillStyle = '#ffffff';
      context.font = '700 22px Arial';
      context.fillText('PV', 80, 97);
    }
  } else {
    context.fillStyle = '#f59e0b';
    context.fillRect(62, 62, 54, 54);
    context.fillStyle = '#ffffff';
    context.font = '700 22px Arial';
    context.fillText('PV', 80, 97);
  }
  context.fillStyle = '#1c1917';
  context.font = '700 32px Arial';
  context.fillText(props.restaurantName, 134, 98);
  context.fillStyle = '#1c1917';
  context.font = '700 24px Arial';
  context.fillText('RESERVATION CONFIRMATION', 60, 160);
  context.fillStyle = '#57534e';
  context.font = '20px Arial';
  context.fillText(`Booking: ${props.bookingNumber}`, 60, 210);
  context.fillText(`Room: ${props.roomName}`, 60, 246);
  context.fillText(`${props.bookingDate} • ${props.startTime} to ${props.endTime}`, 60, 282);
  context.fillText(`Guests: ${props.guestCount}`, 60, 318);
  context.fillText(`Amount: INR ${props.amount.toFixed(2)}`, 60, 354);
  context.fillText(`Status: ${props.bookingStatus}`, 60, 390);
  context.fillText(`Payment: ${props.paymentStatus}`, 60, 426);
  context.fillStyle = '#57534e';
  context.font = '18px Arial';
  context.fillText('Thank you for booking with Pizza Vizza!', 60, 540);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) return resolve(blob);
      reject(new Error('Reservation image could not be generated.'));
    }, 'image/png', 0.96);
  });
}

export default function BookingSlipActions(props: BookingSlipActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const shareText = `${props.restaurantName}\nReservation ${props.bookingNumber}\n${props.roomName}\n${props.bookingDate}, ${props.startTime} to ${props.endTime}\nGuests: ${props.guestCount}\nAmount: ₹${props.amount.toFixed(2)}\nStatus: ${props.bookingStatus}\nPayment: ${props.paymentStatus}`;

  async function share() {
    setMessage(null);
    try {
      const blob = await createReservationImage(props);
      const file = new File([blob], `${props.bookingNumber}-reservation.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Reservation ${props.bookingNumber}`, text: shareText, files: [file] });
        setMessage('Reservation image shared.');
        return;
      }
      setMessage('Your device does not support direct image sharing. Download the image or copy the receipt link.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('Sharing is unavailable on this device.');
      }
    }
  }

  function printSlip() {
    window.print();
  }

  async function downloadImage() {
    try {
      const blob = await createReservationImage(props);
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${props.bookingNumber}-confirmation.png`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Reservation image downloaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reservation image failed.');
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={printSlip} className="min-h-11 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">Download / Print Slip</button>
      <button type="button" onClick={() => void downloadImage()} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Download Image</button>
      <button type="button" onClick={() => void share()} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Share Reservation</button>
      {message ? <p className="basis-full text-sm text-stone-600" role="status">{message}</p> : null}
    </div>
  );
}
