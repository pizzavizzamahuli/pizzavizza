import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber, updateOrderByOrderNumber } from '@/src/models/order';
import { recordTelegramAudit } from '@/src/models/telegram-audit';
import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

function isAllowedProofFile(file: File) {
  return file.size <= MAX_PROOF_SIZE_BYTES && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name));
}

async function saveProofFile(file: File, orderNumber: string) {
  let cloudinaryConfig: { cloudName: string; apiKey: string } | null = null;
  try {
    const cfg = await getCloudinaryConfig();
    cloudinaryConfig = { cloudName: cfg.cloudName, apiKey: cfg.apiKey };
  } catch {
    cloudinaryConfig = null;
  }

  if (cloudinaryConfig) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'pizza-vizza/payment-proofs';
    const signature = await createCloudinarySignature({ folder, timestamp });
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('api_key', cloudinaryConfig.apiKey);
    body.append('timestamp', timestamp);
    body.append('signature', signature);
    body.append('folder', folder);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
      method: 'POST',
      body,
    });
    const result = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'Payment proof upload failed');
    }
    return String(result.secure_url);
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'payment-proofs');
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const safeOrder = orderNumber.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const outName = `${safeOrder}-${Date.now()}-${safeName}`;
  const outPath = path.join(uploadsDir, outName);
  const arrayBuffer = await file.arrayBuffer();
  await fs.promises.writeFile(outPath, Buffer.from(arrayBuffer));
  return `/uploads/payment-proofs/${outName}`;
}

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderNumber } = await context.params;
  if (!orderNumber) return NextResponse.json({ error: 'Missing order number' }, { status: 400 });

  try {
    const contentType = request.headers.get('content-type') || '';
    let proofUrl: string | undefined;
    let transactionId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('proof');
      const rawTransactionId = form.get('transactionId');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Payment proof image required' }, { status: 400 });
      }
      if (!isAllowedProofFile(file)) {
        return NextResponse.json({ error: 'Upload a valid image up to 5 MB.' }, { status: 400 });
      }
      transactionId = typeof rawTransactionId === 'string' ? rawTransactionId.trim() : null;
      proofUrl = await saveProofFile(file, orderNumber);
    } else {
      const payload = await request.json();
      proofUrl = typeof payload.proofUrl === 'string' ? payload.proofUrl.trim() : undefined;
      transactionId = typeof payload.transactionId === 'string' ? payload.transactionId.trim() : null;
    }

    if (!proofUrl) return NextResponse.json({ error: 'proofUrl required' }, { status: 400 });

    const order = await findOrderByOrderNumber(orderNumber);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== user._id?.toHexString()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (order.paymentMethod !== 'MANUAL') return NextResponse.json({ error: 'Payment proof is only available for manual payment orders' }, { status: 400 });

    // Update order to awaiting verification and store proof URL
    const updated = await updateOrderByOrderNumber(orderNumber, {
      paymentStatus: 'AWAITING_VERIFICATION',
      paymentProofUrl: proofUrl,
      transactionId: transactionId || order.transactionId || null,
    });

    // record audit
    await recordTelegramAudit({ performedByUserId: user._id?.toHexString() || null, telegramUserId: null, action: 'payment_proof_uploaded', targetType: 'order', targetId: orderNumber, payload: { proofUrl }, timestamp: new Date() });

    // Notify admins via telegram (best-effort)
    try {
      const { notifyPaymentProof } = await import('@/src/services/telegram-service');
      if (updated) notifyPaymentProof(updated).catch((e) => console.error('notifyPaymentProof failed', e));
    } catch (err) {
      console.error('Failed to dispatch notifyPaymentProof', err);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload proof';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
