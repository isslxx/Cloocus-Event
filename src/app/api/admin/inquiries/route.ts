import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

// 관리자: 문의 리스트 조회
export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  const status = req.nextUrl.searchParams.get('status');
  const search = req.nextUrl.searchParams.get('search');

  const supabase = getServiceSupabase();

  let query = supabase
    .from('event_registrations')
    .select('id, name, company_name, email, inquiry, inquiry_status, event_id, created_at')
    .neq('inquiry', '')
    .not('inquiry', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(0, 9999);

  if (eventId) query = query.eq('event_id', eventId);
  if (status && status !== 'all') query = query.eq('inquiry_status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let results = data || [];

  // 검색 필터 (서버사이드)
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    results = results.filter((r) =>
      r.name?.toLowerCase().includes(s) ||
      r.company_name?.toLowerCase().includes(s) ||
      r.inquiry?.toLowerCase().includes(s)
    );
  }

  // 이벤트 이름 매핑
  const eventIds = [...new Set(results.map((r) => r.event_id).filter(Boolean))];
  let eventMap: Record<string, string> = {};
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds);
    eventMap = Object.fromEntries((events || []).map((e) => [e.id, e.name]));
  }

  // 각 문의의 코멘트 수 조회
  const regIds = results.map((r) => r.id);
  let commentCounts: Record<string, number> = {};
  if (regIds.length > 0) {
    const { data: comments } = await supabase
      .from('inquiry_comments')
      .select('registration_id')
      .in('registration_id', regIds);
    for (const c of comments || []) {
      commentCounts[c.registration_id] = (commentCounts[c.registration_id] || 0) + 1;
    }
  }

  return NextResponse.json(results.map((r) => ({
    ...r,
    event_name: eventMap[r.event_id || ''] || '-',
    comment_count: commentCounts[r.id] || 0,
  })));
}
