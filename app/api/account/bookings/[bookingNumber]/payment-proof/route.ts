import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { updateDiningBooking } from '@/src/models/dining-booking';
import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

function isAllowedProofFile(file: File) {
  return file.size <= MAX_PROOF_SIZE_BYTES && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name));
}

async function saveProofFile(file: File, bookingNumber: string) {
  let cloudinaryConfig: { cloudName: string; apiKey: string } | null = null;
  try {
    const config = await getCloudinaryConfig();
    cloudinaryConfig = { cloudName: config.cloudName, apiKey: config.apiKey };
  } catch {
    cloudinaryConfig = null;
  }

  if (cloudinaryConfig) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'pizza-vizza/reservation-payment-proofs';
    const signature = await createCloudinarySignature({ folder, timestamp });
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('api_key', cloudinaryConfig.apiKey);
    body.append('timestamp', timestamp);
    body.append('signature', signature);
    body.append('folder', folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Payment proof upload failed');
    return String(result.secure_url);
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reservation-payment-proofs');
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const safeBooking = bookingNumber.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${safeBooking}-${Date.now()}-${safeName}`;
  await fs.promises.writeFile(path.join(uploadsDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/reservation-payment-proofs/${fileName}`;
}

export async function POST(request: Request, context: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { bookingNumber } = await context.params;

  try {
    const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.paymentMethod !== 'ONLINE') return NextResponse.json({ error: 'Manual proof is only available for pay now reservations.' }, { status: 400 });

    const form = await request.formData();
    const file = form.get('proof');
    const transactionId = String(form.get('transactionId') || '').trim();
    if (!(file instanceof File) || !isAllowedProofFile(file)) return NextResponse.json({ error: 'Upload a valid image up to 5 MB.' }, { status: 400 });
    if (!transactionId) return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });

    const paymentProofUrl = await saveProofFile(file, bookingNumber);
    const updated = await updateDiningBooking(booking._id!.toHexString(), {
      paymentStatus: 'AWAITING_VERIFICATION',
      transactionId,
      paymentProofUrl,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload payment proof.' }, { status: 500 });
  }
}
