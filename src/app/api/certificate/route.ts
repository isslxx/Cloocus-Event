import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    const { registration_id, pin } = await req.json();
    if (!registration_id || !pin) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: reg } = await supabase
      .from('event_registrations')
      .select('id, pin')
      .eq('id', registration_id)
      .single();

    if (!reg || reg.pin !== pin) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 403 });
    }

    await supabase
      .from('event_registrations')
      .update({ certificate_issued: true, certificate_issued_at: new Date().toISOString() })
      .eq('id', registration_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
