import { NextResponse } from 'next/server';
import { adminUpdateDiningRoom, getDiningRoomById } from '@/src/services/dining-service';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const found = await getDiningRoomById(id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: found });
  } catch (err) {
    console.error('Get dining room failed', err);
    return NextResponse.json({ error: 'Failed to get dining room' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!AuthorizationService.canAccess(user.role, 'bookings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const { id } = await context.params;
    const updated = await adminUpdateDiningRoom(id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update dining room';
    console.error('Update dining room failed', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
