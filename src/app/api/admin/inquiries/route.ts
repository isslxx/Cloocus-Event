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
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(0, 9999);

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 설문 q6_feedback을 문의사항으로 간주: 등록별로 매핑
  const allRegIds = (data || []).map((r) => r.id);
  const surveyFeedbackMap: Record<string, string> = {};
  if (allRegIds.length > 0) {
    const { data: surveys } = await supabase
      .from('surveys')
      .select('registration_id, q6_feedback')
      .in('registration_id', allRegIds);
    for (const s of surveys || []) {
      if (s.q6_feedback && s.q6_feedback.trim() !== '') {
        surveyFeedbackMap[s.registration_id] = s.q6_feedback;
      }
    }
  }

  // inquiry 또는 q6_feedback 둘 중 하나라도 있는 건만 노출
  let results = (data || []).filter((r) => {
    const hasInquiry = r.inquiry && r.inquiry.trim() !== '';
    const hasFeedback = !!surveyFeedbackMap[r.id];
    return hasInquiry || hasFeedback;
  });

  // 상태 필터
  if (status && status !== 'all') {
    results = results.filter((r) => (r.inquiry_status || 'pending') === status);
  }

  // 검색 필터 (서버사이드)
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    results = results.filter((r) =>
      r.name?.toLowerCase().includes(s) ||
      r.company_name?.toLowerCase().includes(s) ||
      r.inquiry?.toLowerCase().includes(s) ||
      surveyFeedbackMap[r.id]?.toLowerCase().includes(s)
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
    survey_feedback: surveyFeedbackMap[r.id] || null,
  })));
}
