import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('form_options')
    .select('*')
    .order('field_key')
    .order('sort_order', { ascending: true });

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { field_key, label, sort_order } = await req.json();
  if (!field_key || !label) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('form_options').insert({
    field_key, label: label.trim(), sort_order: sort_order || 0, active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, label, sort_order, active } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  const supabase = getServiceSupabase();
  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = label.trim();
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (active !== undefined) updates.active = active;

  const { error } = await supabase.from('form_options').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('form_options').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
