import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: { id: user._id?.toHexString(), name: user.name, email: user.email, role: user.role } });
}
