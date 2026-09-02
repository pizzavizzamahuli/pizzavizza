import { NextResponse } from 'next/server';
import { extractCloudinaryPublicId, deleteCloudinaryResource } from '@/src/utils/cloudinary';
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
    if (publicId.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', publicId.replace(/^\//, ''));
      try {
        await fs.promises.unlink(localPath);
      } catch (error: unknown) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
        if (code !== 'ENOENT') throw error;
      }
      return NextResponse.json({ success: true });
    }

    const cloudinaryPublicId = extractCloudinaryPublicId(publicId) || publicId.trim();
    if (!cloudinaryPublicId) {
      return NextResponse.json({ error: 'Invalid image identifier' }, { status: 400 });
    }
    await deleteCloudinaryResource(cloudinaryPublicId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete image' }, { status: 500 });
  }
}
