import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AddressDocument, findAddressById, updateAddress, deleteAddress } from '@/src/models/address';
export async function GET(request: Request, context: unknown) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const id = (context as { params: { id: string } })?.params?.id;
  const found = await findAddressById(id);
  if (!found || found.userId !== user._id!.toHexString()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: found });
}

export async function PUT(request: Request, context: unknown) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const id = (context as { params: { id: string } })?.params?.id;
  const payload = await request.json();
  const found = await findAddressById(id);
  if (!found || found.userId !== user._id!.toHexString()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await updateAddress(id, payload as Partial<AddressDocument>);
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request, context: unknown) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const id = (context as { params: { id: string } })?.params?.id;
  const found = await findAddressById(id);
  if (!found || found.userId !== user._id!.toHexString()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await deleteAddress(id);
  return NextResponse.json({ success: true });
}
