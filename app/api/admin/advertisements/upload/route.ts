import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';

export const runtime = 'nodejs';
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

function isSupportedImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  if (type === 'image/gif') return new TextDecoder().decode(bytes.subarray(0, 6)).match(/^GIF8[79]a$/) !== null;
  if (type === 'image/webp') return new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP';
  return false;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_SIZE + 64 * 1024) {
      return NextResponse.json({ error: 'Choose an image smaller than 4 MB.' }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Choose an image smaller than 4 MB.' }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isSupportedImage(bytes, file.type)) {
      return NextResponse.json({ error: 'Use a valid JPEG, PNG, GIF, or WebP image.' }, { status: 400 });
    }

    const { cloudName, apiKey } = await getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'pizza-vizza/advertisements';
    const signature = await createCloudinarySignature({ folder, timestamp });
    const upload = new FormData();
    upload.append('file', new Blob([bytes], { type: file.type }), file.name);
    upload.append('api_key', apiKey);
    upload.append('timestamp', timestamp);
    upload.append('signature', signature);
    upload.append('folder', folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: upload });
    if (!response.ok) return NextResponse.json({ error: 'Image upload failed.' }, { status: 502 });
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('secure_url' in result) || typeof result.secure_url !== 'string'
      || !result.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)) {
      return NextResponse.json({ error: 'Image upload failed.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: result.secure_url });
  } catch {
    return NextResponse.json({ error: 'Image upload is unavailable. Check Cloudinary configuration.' }, { status: 503 });
  }
}
