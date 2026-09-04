import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findLegalPageBySlug, updateLegalPage } from '@/src/models/legal-page';
import { recordAudit } from '@/src/models/audit-log';

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;
  const existing = await findLegalPageBySlug(slug);
  if (!existing) return NextResponse.json({ error: 'Legal page not found' }, { status: 404 });

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const isPublished = typeof payload.isPublished === 'boolean' ? payload.isPublished : true;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const updated = await updateLegalPage(slug, { title, content, isPublished });
    await recordAudit({
      type: 'LEGAL_PAGE_UPDATED',
      performedBy: user._id?.toHexString() || user.email || null,
      oldValue: { slug: existing.slug, title: existing.title, isPublished: existing.isPublished },
      newValue: { slug, title, isPublished },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update legal page';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
