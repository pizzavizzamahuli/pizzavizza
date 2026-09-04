import { NextResponse } from 'next/server';
import { findCategoryById } from '@/src/models/category';
import { adminUpdateCategory } from '@/src/services/menu-service';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage', user.permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const { id } = await context.params;
    const updated = await adminUpdateCategory(id, payload as unknown);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update category failed', err);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 400 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const found = await findCategoryById(id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: found });
  } catch (err) {
    console.error('Get category failed', err);
    return NextResponse.json({ error: 'Failed to get category' }, { status: 500 });
  }
}
