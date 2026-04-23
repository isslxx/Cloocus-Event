import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) return NextResponse.json([]);

  const supabase = getServiceSupabase();

  // 설문 활성화된 등록자 목록 (전체 필드)
  const { data } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('survey_enabled', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const regs = data || [];
  const regIds = regs.map((r) => r.id);

  // 설문 응답 병합 (q1~q6)
  const surveyMap: Record<string, Record<string, unknown>> = {};
  if (regIds.length > 0) {
    const { data: surveys } = await supabase
      .from('surveys')
      .select('registration_id, q1_azure_level, q2_difficulty, q3_purpose, q4_adoption, q5_consulting, q6_feedback, created_at')
      .in('registration_id', regIds);
    for (const s of surveys || []) {
      surveyMap[s.registration_id] = s;
    }
  }

  return NextResponse.json(regs.map((r) => {
    const s = surveyMap[r.id] || {};
    const q6 = (s.q6_feedback as string | null) || '';
    return {
      ...r,
      q1_azure_level: s.q1_azure_level || null,
      q2_difficulty: s.q2_difficulty || null,
      q3_purpose: s.q3_purpose || null,
      q4_adoption: s.q4_adoption || null,
      q5_consulting: s.q5_consulting || null,
      q6_feedback: q6 || null,
      survey_feedback: q6.trim() !== '' ? q6 : null,
      survey_submitted_at: s.created_at || null,
    };
  }));
}
