import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { listAddressesForUser, createAddress, AddressDocument } from '@/src/models/address';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const list = await listAddressesForUser(user._id!.toHexString());
  return NextResponse.json({ success: true, data: list });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const payload = await request.json();
    const doc: Partial<AddressDocument> = { ...(payload as Partial<AddressDocument>), userId: user._id!.toHexString() };
    const created = await createAddress(doc);
    return NextResponse.json({ success: true, data: created });
  } catch {
    return NextResponse.json({ error: 'Failed to create address' }, { status: 400 });
  }
}
