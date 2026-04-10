import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, canDelete } from '@/lib/supabase-auth';
import { getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const url = req.nextUrl;

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search') || '';
  const event_id = url.searchParams.get('event_id') || '';
  const industry = url.searchParams.get('industry') || '';
  const company_size = url.searchParams.get('company_size') || '';
  const referral_source = url.searchParams.get('referral_source') || '';
  const year = url.searchParams.get('year') || '';
  const email_status = url.searchParams.get('email_status') || '';
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = url.searchParams.get('order') === 'asc' ? true : false;

  let query = supabase
    .from('event_registrations')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (event_id) query = query.eq('event_id', event_id);
  if (industry) query = query.eq('industry', industry);
  if (company_size) query = query.eq('company_size', company_size);
  if (referral_source) query = query.eq('referral_source', referral_source);
  if (year) {
    query = query.gte('created_at', `${year}-01-01T00:00:00`).lt('created_at', `${parseInt(year) + 1}-01-01T00:00:00`);
  }
  if (email_status === 'not_sent') query = query.is('email_status', null);
  else if (email_status) query = query.eq('email_status', email_status);

  query = query
    .order(sort, { ascending: order })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canDelete(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const supabase = getServiceSupabase();

  // 삭제 전 레코드 저장 (감사 로그용)
  const { data: record } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 감사 로그
  if (record) {
    await supabase.from('audit_log').insert({
      admin_user_id: admin.id,
      admin_email: admin.email,
      action: 'delete',
      target_id: id,
      changes: record,
    });
  }

  return NextResponse.json({ success: true });
}
