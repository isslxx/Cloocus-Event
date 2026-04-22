import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminSurveyComplete } from '@/lib/notifications';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 기존 설문 응답 조회
export async function GET(req: NextRequest) {
  try {
    const regId = req.nextUrl.searchParams.get('registration_id');
    const pin = req.nextUrl.searchParams.get('pin');
    if (!regId || !pin) return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: reg } = await supabase.from('event_registrations').select('id, pin').eq('id', regId).single();
    if (!reg || reg.pin !== pin) return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 403 });

    const { data } = await supabase.from('surveys').select('*').eq('registration_id', regId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return NextResponse.json({ exists: false });

    return NextResponse.json({ exists: true, survey: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { registration_id, pin, q1_azure_level, q2_difficulty, q3_purpose, q4_adoption, q5_consulting, q6_feedback } = await req.json();

    if (!registration_id || !pin) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // PIN 검증
    const { data: reg } = await supabase
      .from('event_registrations')
      .select('id, pin, survey_enabled, survey_completed')
      .eq('id', registration_id)
      .single();

    if (!reg || reg.pin !== pin) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 403 });
    }

    if (!reg.survey_enabled) {
      return NextResponse.json({ error: '설문조사가 활성화되지 않았습니다.' }, { status: 400 });
    }

    // 필수 항목 검증
    if (!q1_azure_level || !q2_difficulty || !q3_purpose?.length || !q4_adoption || !q5_consulting?.length) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
    }

    // 기존 설문이 있으면 업데이트, 없으면 신규 저장
    if (reg.survey_completed) {
      const { error: updateError } = await supabase
        .from('surveys')
        .update({ q1_azure_level, q2_difficulty, q3_purpose, q4_adoption, q5_consulting, q6_feedback: q6_feedback || '' })
        .eq('registration_id', registration_id);

      if (updateError) {
        return NextResponse.json({ error: '설문 수정 중 오류가 발생했습니다.' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from('surveys').insert({
        registration_id,
        q1_azure_level,
        q2_difficulty,
        q3_purpose,
        q4_adoption,
        q5_consulting,
        q6_feedback: q6_feedback || '',
      });

      if (insertError) {
        return NextResponse.json({ error: '설문 저장 중 오류가 발생했습니다.' }, { status: 500 });
      }

      await supabase
        .from('event_registrations')
        .update({ survey_completed: true })
        .eq('id', registration_id);

      // 관리자 알림 (신규 설문 접수만, 수정 시에는 발송 안 함)
      try {
        const { data: regFull } = await supabase
          .from('event_registrations')
          .select('name, company_name, event_id, events(name, category)')
          .eq('id', registration_id)
          .maybeSingle();
        const evt = (regFull as unknown as { events?: { name: string; category: string } })?.events;
        if (regFull && evt) {
          await notifyAdminSurveyComplete({
            userName: regFull.name,
            companyName: regFull.company_name,
            eventName: evt.name,
            eventCategory: evt.category,
            registrationId: registration_id,
          });
        }
      } catch (err) {
        console.error('[survey] admin notify failed:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
