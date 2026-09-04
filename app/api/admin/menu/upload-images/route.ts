import { createCloudinarySignature, getCloudinaryConfig } from '@/src/utils/cloudinary';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    let cloudinaryConfig: { cloudName: string; apiKey: string } | null = null;
    try {
      const cfg = await getCloudinaryConfig();
      cloudinaryConfig = { cloudName: cfg.cloudName, apiKey: cfg.apiKey };
      console.log('Cloudinary config:', { cloudName: cfg.cloudName, apiKey: !!cfg.apiKey });
    } catch {
      console.log('Cloudinary not configured, will save uploads locally for dev/testing');
    }
    const formData = await request.formData();
    const fieldNames = ['images', 'image', 'file', 'files', 'images[]'];
    const collectedFiles = fieldNames.flatMap((fieldName) => formData.getAll(fieldName));
    const files = collectedFiles.filter((item): item is File => {
      if (!(item instanceof File)) return false;
      return item.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(item.name);
    });

    if (!files.length) {
      return NextResponse.json({ error: 'No images uploaded' }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const uploadPromises = files.map(async (file) => {
      if (cloudinaryConfig) {
        const { cloudName, apiKey } = await getCloudinaryConfig();
        const signature = await createCloudinarySignature({ folder: 'pizza-vizza/products', timestamp: String(timestamp) });
        const body = new FormData();
        body.append('file', file, file.name);
        body.append('api_key', apiKey);
        body.append('timestamp', String(timestamp));
        body.append('signature', signature);
        body.append('folder', 'pizza-vizza/products');

        console.debug('Uploading file to Cloudinary:', { name: file.name, type: file.type, size: file.size });

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`Cloudinary upload failed for ${file.name}:`, {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
          });
          throw new Error(`Cloudinary rejected upload: ${uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json();
        if (!result.secure_url) {
          console.error('Cloudinary response missing secure_url:', result);
          throw new Error('Cloudinary did not return secure_url');
        }
        return result.secure_url as string;
      }

      // Local fallback: save to public/uploads/products
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
      try {
        await fs.promises.mkdir(uploadsDir, { recursive: true });
      } catch {
        // ignore
      }
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const outPath = path.join(uploadsDir, safeName);
      const arrayBuffer = await file.arrayBuffer();
      await fs.promises.writeFile(outPath, Buffer.from(arrayBuffer));
      const publicUrl = `/uploads/products/${safeName}`;
      return publicUrl;
    });

    const urls = await Promise.all(uploadPromises);
    if (!urls.length) {
      return NextResponse.json({ error: 'No valid URLs returned from image upload' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Image upload failed:', message, error);
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
