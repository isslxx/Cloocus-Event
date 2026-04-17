import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) return NextResponse.json([]);

  const supabase = getServiceSupabase();

  // 삭제되지 않은 설문 대상자만 조회
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('id, name, company_name, email, phone')
    .eq('event_id', eventId)
    .eq('survey_completed', true)
    .eq('survey_enabled', true)
    .is('deleted_at', null);

  if (!regs || regs.length === 0) return NextResponse.json([]);

  const regIds = regs.map((r) => r.id);
  const regMap = new Map(regs.map((r) => [r.id, r]));

  const { data: surveys } = await supabase
    .from('surveys')
    .select('*')
    .in('registration_id', regIds)
    .order('created_at', { ascending: false });

  return NextResponse.json((surveys || []).map((s) => {
    const reg = regMap.get(s.registration_id);
    return {
      id: s.id,
      registration_id: s.registration_id,
      q1_azure_level: s.q1_azure_level,
      q2_difficulty: s.q2_difficulty,
      q3_purpose: s.q3_purpose,
      q4_adoption: s.q4_adoption,
      q5_consulting: s.q5_consulting,
      q6_feedback: s.q6_feedback,
      created_at: s.created_at,
      name: reg?.name || '',
      company_name: reg?.company_name || '',
      email: reg?.email || '',
      phone: reg?.phone || '',
    };
  }));
}
