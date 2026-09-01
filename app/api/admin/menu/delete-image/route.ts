import { NextResponse } from 'next/server';
import { getCloudinaryConfig, createCloudinarySignature, extractCloudinaryPublicId } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const publicId = url.searchParams.get('publicId');

  if (!publicId) {
    return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
  }

  try {
    // Try Cloudinary first
    try {
      const { cloudName, apiKey } = await getCloudinaryConfig();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await createCloudinarySignature({ public_id: publicId, timestamp, resource_type: 'image' });

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp);
      formData.append('api_key', apiKey);
      formData.append('signature', signature);
      formData.append('resource_type', 'image');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();
      if (!response.ok || json.result !== 'ok') {
        return NextResponse.json({ error: json.error?.message || 'Failed to delete image' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch {
      // Cloudinary not configured or delete failed; try local fallback
      if (publicId.startsWith('/')) {
        const publicPath = publicId;
        const localPath = path.join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
        try {
          await fs.promises.unlink(localPath);
          return NextResponse.json({ success: true });
        } catch (err) {
          console.error('Failed to delete local file', localPath, err);
          return NextResponse.json({ error: 'Failed to delete local image' }, { status: 500 });
        }
      }
      // If publicId looks like a Cloudinary URL, extract public id and attempt to delete
      const extracted = extractCloudinaryPublicId(publicId);
      if (extracted) {
        try {
          const { cloudName, apiKey } = await getCloudinaryConfig();
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const signature = await createCloudinarySignature({ public_id: extracted, timestamp, resource_type: 'image' });
          const formData = new FormData();
          formData.append('public_id', extracted);
          formData.append('timestamp', timestamp);
          formData.append('api_key', apiKey);
          formData.append('signature', signature);
          formData.append('resource_type', 'image');

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            body: formData,
          });
          const json = await response.json();
          if (!response.ok || json.result !== 'ok') {
            return NextResponse.json({ error: json.error?.message || 'Failed to delete image' }, { status: 500 });
          }
          return NextResponse.json({ success: true });
        } catch (err) {
          console.error('Delete image fallback failed', err);
          return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
        }
      }
      return NextResponse.json({ error: 'Cloudinary not configured and publicId not a local path' }, { status: 400 });
    }
  } catch (error) {
    console.error('Delete image failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete image' }, { status: 500 });
  }
}
