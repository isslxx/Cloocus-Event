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
    .select('id, name, company_name, department, job_title, email, phone, industry, company_size, referral_source, referrer_name, registration_status, survey_completed, created_at')
    .eq('event_id', eventId)
    .eq('survey_enabled', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}
