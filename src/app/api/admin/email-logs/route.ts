import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const url = req.nextUrl;

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const event_id = url.searchParams.get('event_id') || '';
  const email_type = url.searchParams.get('email_type') || '';
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  let query = supabase
    .from('email_logs')
    .select('*', { count: 'exact' });

  if (event_id) query = query.eq('event_id', event_id);
  if (email_type) query = query.eq('email_type', email_type);
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`recipient_email.ilike.%${search}%,recipient_name.ilike.%${search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}
