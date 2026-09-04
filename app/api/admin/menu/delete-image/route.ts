import { NextResponse } from 'next/server';
import { extractCloudinaryPublicId, deleteCloudinaryResource } from '@/src/utils/cloudinary';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user || (!AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions) && !AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions) && !AuthorizationService.canAccess(user.role, 'bookings.manage', user.permissions))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
