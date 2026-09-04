import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listLegalPages } from '@/src/models/legal-page';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pages = await listLegalPages();
  return NextResponse.json({ success: true, data: pages.map((page) => ({
    id: page._id?.toHexString() || page.id,
    slug: page.slug,
    title: page.title,
    content: page.content,
    isPublished: page.isPublished,
    updatedAt: page.updatedAt,
  })) });
}
