import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { adminGetCustomizationGroup, adminUpdateCustomizationGroup, adminDeleteCustomizationGroup } from '@/src/services/menu-service';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const group = await adminGetCustomizationGroup(id);
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: group });
  } catch (err) {
    console.error('Get customization group failed', err);
    return NextResponse.json({ error: 'Failed to get customization group' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = await request.json();
    const updated = await adminUpdateCustomizationGroup(id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update customization group failed', err);
    return NextResponse.json({ error: 'Failed to update customization group' }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'menu.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const deleted = await adminDeleteCustomizationGroup(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete customization group failed', err);
    return NextResponse.json({ error: 'Failed to delete customization group' }, { status: 400 });
  }
}
