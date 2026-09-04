import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getAuditLogCollection } from '@/src/models/audit-log';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get('pageSize') || '50')));
  const typeFilter = url.searchParams.get('type') || null;

  const col = await getAuditLogCollection();
  const query: Record<string, unknown> = {};
  if (typeFilter) query.type = typeFilter;

  const total = await col.countDocuments(query);
  const cursor = col.find(query).sort({ timestamp: -1 }).skip((page - 1) * pageSize).limit(pageSize);
  const items = await cursor.toArray();

  return NextResponse.json({ success: true, data: { items, page, pageSize, total } });
}
