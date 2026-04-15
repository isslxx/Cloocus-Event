import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('event_registrations')
      .select('name, email, company_name, registration_status, events!event_registrations_event_id_fkey(name, event_date, event_type, category)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '등록 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const evt = Array.isArray(data.events) ? data.events[0] : data.events;

    return NextResponse.json({
      valid: true,
      name: data.name,
      email: data.email,
      company: data.company_name,
      registration_status: data.registration_status || 'pending',
      event_name: evt?.name || '',
      event_date: evt?.event_date || '',
      event_type: evt?.event_type || '',
      event_category: evt?.category || '이벤트',
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
