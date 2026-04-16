import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) return NextResponse.json([]);

  const supabase = getServiceSupabase();

  // Get registrations for this event that have completed surveys
  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('id, name, company_name, email, phone')
    .eq('event_id', eventId)
    .eq('survey_completed', true)
    .is('deleted_at', null);

  if (!registrations || registrations.length === 0) return NextResponse.json([]);

  const regIds = registrations.map((r) => r.id);
  const regMap = new Map(registrations.map((r) => [r.id, r]));

  const { data: surveys } = await supabase
    .from('surveys')
    .select('*')
    .in('registration_id', regIds)
    .order('created_at', { ascending: false });

  const result = (surveys || []).map((s) => {
    const reg = regMap.get(s.registration_id);
    return {
      ...s,
      name: reg?.name || '',
      company_name: reg?.company_name || '',
      email: reg?.email || '',
      phone: reg?.phone || '',
    };
  });

  return NextResponse.json(result);
}
