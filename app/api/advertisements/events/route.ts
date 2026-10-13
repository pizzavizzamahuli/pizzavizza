import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Ad measurement is disabled.' }, { status: 410 });
}
