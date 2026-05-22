import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadSurveyQuestions } from '@/lib/survey-questions';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 신청자 포탈용 공개 엔드포인트.
// 설문 폼은 질문 메타데이터(이름/옵션)만 사용하기 때문에 PII 가 없어 공개 가능하다.
// event_id 가 비면 기본 설문조사를 반환한다.
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  const supabase = getServiceSupabase();
  const questions = await loadSurveyQuestions(supabase, eventId);
  return NextResponse.json({ questions });
}
