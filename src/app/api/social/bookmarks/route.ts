import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

const MAX_BOOKMARKS = 500;

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, vendor_id, created_at, vendor:vendors!bookmarks_vendor_id_fkey(id, name, slug, neighbourhood, category)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookmarks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('is_banned').eq('id', user.id).single();
  if (me?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

  const { vendor_id } = await req.json().catch(() => ({}));
  if (!vendor_id) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });

  // Cannot bookmark if already rated
  const { data: rated } = await supabase.from('user_tags').select('user_id')
    .eq('user_id', user.id).eq('vendor_id', vendor_id).maybeSingle();
  if (rated) return NextResponse.json({ error: "You've already rated this place" }, { status: 409 });

  // Max 500 bookmarks
  const { count } = await supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) >= MAX_BOOKMARKS) {
    return NextResponse.json({ error: `You have reached the maximum of ${MAX_BOOKMARKS} saved places. Remove some to add more.` }, { status: 409 });
  }

  // Upsert (idempotent)
  const { error } = await supabase.from('bookmarks')
    .upsert({ user_id: user.id, vendor_id }, { onConflict: 'user_id,vendor_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get('vendor_id');
  if (!vendorId) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });

  await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('vendor_id', vendorId);
  return NextResponse.json({ success: true });
}
