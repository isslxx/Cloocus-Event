import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) return NextResponse.json([]);

  const supabase = getServiceSupabase();

  // 설문 활성화된 등록자 목록 (개인정보 포함)
  const { data } = await supabase
    .from('event_registrations')
    .select('id, name, company_name, department, job_title, email, phone, industry, company_size, referral_source, referrer_name, inquiry, inquiry_status, registration_status, survey_completed, created_at')
    .eq('event_id', eventId)
    .eq('survey_enabled', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const regs = data || [];
  const regIds = regs.map((r) => r.id);

  // 설문 q6_feedback 병합 (설문 피드백을 문의사항과 함께 노출)
  const feedbackMap: Record<string, string> = {};
  if (regIds.length > 0) {
    const { data: surveys } = await supabase
      .from('surveys')
      .select('registration_id, q6_feedback')
      .in('registration_id', regIds);
    for (const s of surveys || []) {
      if (s.q6_feedback && s.q6_feedback.trim() !== '') {
        feedbackMap[s.registration_id] = s.q6_feedback;
      }
    }
  }

  return NextResponse.json(regs.map((r) => ({
    ...r,
    survey_feedback: feedbackMap[r.id] || null,
  })));
}
