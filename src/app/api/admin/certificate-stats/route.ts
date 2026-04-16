import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  const supabase = getServiceSupabase();

  let query = supabase
    .from('event_registrations')
    .select('id, name, company_name, email, event_id, registration_status, survey_completed, certificate_issued, certificate_issued_at')
    .eq('registration_status', 'confirmed')
    .is('deleted_at', null);

  if (eventId) query = query.eq('event_id', eventId);

  const { data } = await query.order('certificate_issued_at', { ascending: false, nullsFirst: false });

  return NextResponse.json(data || []);
}
