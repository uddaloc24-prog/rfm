import { NextRequest, NextResponse } from 'next/server';

const ADMIN_USER = 'uddaloc';
const ADMIN_PASS = 'Qwerty@123';
const COOKIE_NAME = 'rfm_admin';
const COOKIE_VALUE = 'granted';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
