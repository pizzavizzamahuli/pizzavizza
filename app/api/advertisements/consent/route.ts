import { NextResponse } from 'next/server';
import { removeAdSessionEvents } from '@/src/models/advertisement';

function responseWithChoice(choice: 'accepted' | 'rejected', body: { success: boolean; warning?: string }) {
  const response = NextResponse.json(body);
  response.cookies.set('pv_local_ads_consent', choice, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}

export async function POST(request: Request) {
  let choice: unknown;
  let sessionId: unknown;
  try {
    const body = await request.json() as { choice?: unknown; sessionId?: unknown };
    choice = body.choice;
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: 'Invalid consent preference.' }, { status: 400 });
  }
  if (choice !== 'accepted' && choice !== 'rejected') {
    return NextResponse.json({ error: 'Invalid consent preference.' }, { status: 400 });
  }
  if (choice === 'rejected' && typeof sessionId === 'string') {
    try {
      await removeAdSessionEvents(sessionId);
    } catch {
      return responseWithChoice(choice, {
        success: true,
        warning: 'Your preference was saved. Previously recorded anonymous totals could not be removed and will expire within 60 days.',
      });
    }
  }
  return responseWithChoice(choice, { success: true });
}
