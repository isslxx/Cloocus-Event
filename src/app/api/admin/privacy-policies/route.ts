import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data } = await supabase.from('privacy_policies').select('*').order('created_at');
  return NextResponse.json(data || []);
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, content } = await req.json();
  if (!id || !content) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('privacy_policies').update({ content, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
