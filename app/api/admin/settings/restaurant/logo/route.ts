import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo');
    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please select an image file' }, { status: 400 });
    }

    try {
      const { cloudName, apiKey } = await getCloudinaryConfig();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const folder = 'pizza-vizza/branding';
      const signature = await createCloudinarySignature({ folder, timestamp });
      const body = new FormData();
      body.append('file', file, file.name);
      body.append('api_key', apiKey);
      body.append('timestamp', timestamp);
      body.append('signature', signature);
      body.append('folder', folder);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Logo upload failed');
      return NextResponse.json({ success: true, data: result.secure_url });
    } catch (error) {
      if (error instanceof Error && !error.message.includes('not configured')) throw error;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await fs.promises.writeFile(path.join(uploadsDir, safeName), Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ success: true, data: `/uploads/branding/${safeName}` });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Logo upload failed' }, { status: 500 });
  }
}
