import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const formData = await request.formData();
    const files = formData.getAll('images').filter((value): value is File => value instanceof File && value.type.startsWith('image/'));
    if (!files.length) return NextResponse.json({ error: 'Please select at least one image' }, { status: 400 });
    const urls: string[] = [];
    for (const file of files) {
      try {
        const { cloudName, apiKey } = await getCloudinaryConfig();
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const folder = 'pizza-vizza/dining';
        const signature = await createCloudinarySignature({ folder, timestamp });
        const body = new FormData();
        body.append('file', file, file.name);
        body.append('api_key', apiKey);
        body.append('timestamp', timestamp);
        body.append('signature', signature);
        body.append('folder', folder);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
        const result = await response.json();
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Image upload failed');
        urls.push(result.secure_url);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('not configured')) throw error;
        const directory = path.join(process.cwd(), 'public', 'uploads', 'dining');
        await fs.promises.mkdir(directory, { recursive: true });
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await fs.promises.writeFile(path.join(directory, safeName), Buffer.from(await file.arrayBuffer()));
        urls.push(`/uploads/dining/${safeName}`);
      }
    }
    return NextResponse.json({ success: true, data: urls });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed' }, { status: 500 });
  }
}
