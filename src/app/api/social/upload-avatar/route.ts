import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (file.size > 2 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext))
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
