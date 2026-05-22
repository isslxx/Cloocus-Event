import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminSurveyComplete } from '@/lib/notifications';
import {
  DEFAULT_SURVEY_QUESTIONS,
  loadSurveyQuestions,
  mapAnswersToLegacyColumns,
  validateAnswers,
  type SurveyAnswer,
} from '@/lib/survey-questions';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 기존 응답 조회. 응답에는 generic answers JSONB 와 legacy q1~q6 가 모두 들어있다.
// 신청자 페이지는 answers 가 있으면 그것 우선, 없으면 legacy 매핑으로 채워 표시한다.
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

// 응답 저장 — 새 동적 페이로드(answers 배열) 처리. 기본 Azure 6문항이면 q1~q6 컬럼에도
// 매핑해 두어 legacy 대시보드(survey-list/survey-responses, 엑셀 export) 가 그대로 작동한다.
//
// 페이로드: { registration_id, pin, answers: SurveyAnswer[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registration_id, pin } = body as { registration_id?: string; pin?: string };

    if (!registration_id || !pin) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: reg } = await supabase
      .from('event_registrations')
      .select('id, pin, event_id, survey_enabled, survey_completed')
      .eq('id', registration_id)
      .single();

    if (!reg || reg.pin !== pin) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 403 });
    }

    if (!reg.survey_enabled) {
      return NextResponse.json({ error: '설문조사가 활성화되지 않았습니다.' }, { status: 400 });
    }

    // 새 페이로드(answers) 와 legacy 페이로드(q1_azure_level 등) 모두 수용한다.
    let answers: SurveyAnswer[] = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length === 0) {
      // legacy 호환: q1~q6 만 들어왔다면 코드 기본 질문 메타데이터로 변환
      const legacyMap = [
        { key: 'q1_azure_level', q: DEFAULT_SURVEY_QUESTIONS[0] },
        { key: 'q2_difficulty',  q: DEFAULT_SURVEY_QUESTIONS[1] },
        { key: 'q3_purpose',     q: DEFAULT_SURVEY_QUESTIONS[2] },
        { key: 'q4_adoption',    q: DEFAULT_SURVEY_QUESTIONS[3] },
        { key: 'q5_consulting',  q: DEFAULT_SURVEY_QUESTIONS[4] },
        { key: 'q6_feedback',    q: DEFAULT_SURVEY_QUESTIONS[5] },
      ];
      answers = legacyMap
        .filter(({ key }) => body[key] !== undefined && body[key] !== null && body[key] !== '')
        .map(({ key, q }) => ({
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          value: body[key],
        }));
    }

    if (answers.length === 0) {
      return NextResponse.json({ error: '응답을 입력해주세요.' }, { status: 400 });
    }

    // 검증: required / type 일치
    const questions = await loadSurveyQuestions(supabase, reg.event_id);
    const validationError = validateAnswers(questions, answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const legacy = mapAnswersToLegacyColumns(answers);

    const payload: Record<string, unknown> = {
      answers,
      // legacy 컬럼은 기본 6문항이면 채우고, 아니면 null 로 둔다
      q1_azure_level: legacy?.q1_azure_level ?? null,
      q2_difficulty:  legacy?.q2_difficulty  ?? null,
      q3_purpose:     legacy?.q3_purpose     ?? null,
      q4_adoption:    legacy?.q4_adoption    ?? null,
      q5_consulting:  legacy?.q5_consulting  ?? null,
      q6_feedback:    legacy?.q6_feedback    ?? '',
    };

    if (reg.survey_completed) {
      const { error: updateError } = await supabase
        .from('surveys')
        .update(payload)
        .eq('registration_id', registration_id);

      if (updateError) {
        return NextResponse.json({ error: '설문 수정 중 오류가 발생했습니다.' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from('surveys').insert({
        registration_id,
        ...payload,
      });

      if (insertError) {
        return NextResponse.json({ error: '설문 저장 중 오류가 발생했습니다.' }, { status: 500 });
      }

      await supabase
        .from('event_registrations')
        .update({ survey_completed: true })
        .eq('id', registration_id);
    }

    // 관리자 알림 (신규/수정 모두 발송)
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
