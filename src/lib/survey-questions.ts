// 설문 질문 정의/조회 헬퍼
//
// 이전엔 신청자 포탈(my/page.tsx)이 Azure 6문항을 코드에 박아두고 있었고
// admin "설문 폼" 페이지에서의 편집이 신청자 측에 반영되지 않았다. 이 모듈은
// event_id 기준으로 survey_questions 테이블을 읽어 신청자 폼에 동적으로
// 노출하기 위한 단일 진입점이다.
//
// 우선순위:
//   1) survey_questions WHERE event_id = X AND active = true
//   2) survey_questions WHERE event_id IS NULL AND active = true  (기본 설문)
//   3) DEFAULT_SURVEY_QUESTIONS (코드 fallback — DB 가 비었을 때 안전망)

import type { SupabaseClient } from '@supabase/supabase-js';

export type SurveyQuestionType = 'single' | 'multiple' | 'text';

export type SurveyQuestion = {
  id: string;
  event_id: string | null;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
  required: boolean;
  sort_order: number;
  active: boolean;
};

export type SurveyAnswer = {
  question_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  value: string | string[];
};

// 코드 기본 6문항 (Azure 핸즈온 시리즈) — DB 가 비었을 때만 사용된다.
// id 는 안정적인 슬러그를 부여해 answers JSONB 의 question_id 가 일관되게 유지되도록 한다.
export const DEFAULT_SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'default-q1-azure-level',
    event_id: null,
    question_text: '교육 전 Microsoft Azure에 대한 이해 수준은 어느 정도입니까?',
    question_type: 'single',
    options: [
      '전혀 모름 (들어봤으나 사용 경험 없음)',
      '기본 개념 (Azure 역할 및 주요 서비스 이해)',
      '기초 수준 (리소스 생성 등 기본 실습/사용 경험)',
      '중급 수준 (가상머신, 스토리지 등 일부 서비스 적용 경험)',
      '고급 수준 (아키텍처 설계, 최적화 등 고급 기능 숙지)',
    ],
    required: true,
    sort_order: 1,
    active: true,
  },
  {
    id: 'default-q2-difficulty',
    event_id: null,
    question_text: '오늘 참여한 이벤트의 난이도는 어떠셨나요?',
    question_type: 'single',
    options: ['매우 쉬움', '적절함', '다소 어려움', '매우 어려움'],
    required: true,
    sort_order: 2,
    active: true,
  },
  {
    id: 'default-q3-purpose',
    event_id: null,
    question_text: '본 이벤트에 참여하신 목적은 무엇입니까? (복수 선택 가능)',
    question_type: 'multiple',
    options: [
      '기초 지식 및 기본 역량 확보',
      '클라우드 도입 전 비교/평가',
      '사내 PoC 프로젝트 준비',
      'Azure 전환(마이그레이션) 검토',
      '사용 중인 Azure 기술 고도화',
      '기타',
    ],
    required: true,
    sort_order: 3,
    active: true,
  },
  {
    id: 'default-q4-adoption',
    event_id: null,
    question_text: '현재 Microsoft Azure 도입 또는 마이그레이션을 고려 중입니까?',
    question_type: 'single',
    options: [
      '이미 사용 중 (추가 도입/확장 계획 있음)',
      '이미 사용 중 (추가 도입/확장 계획 없음)',
      '6개월 이내 도입 계획 있음',
      '1년 이내 도입 계획 있음',
      '계획 없음 / 미정',
    ],
    required: true,
    sort_order: 4,
    active: true,
  },
  {
    id: 'default-q5-consulting',
    event_id: null,
    question_text: 'Microsoft Azure 추가 활용에 대한 클루커스의 컨설팅이 필요하십니까? (복수 선택 가능)',
    question_type: 'multiple',
    options: ['예 (클루커스의 추가 컨설팅 필요)', '예 (교육/세미나 이벤트 소식 필요)', '필요 없음'],
    required: true,
    sort_order: 5,
    active: true,
  },
  {
    id: 'default-q6-feedback',
    event_id: null,
    question_text: '참여 후기, 추가로 배우고 싶은 교육 주제 등 피드백이 있으시면 편히 말씀 부탁드립니다.',
    question_type: 'text',
    options: [],
    required: false,
    sort_order: 6,
    active: true,
  },
];

// 이벤트별 설문 질문 조회 (활성 + sort_order 정렬). 위 우선순위 규칙대로 fallback.
export async function loadSurveyQuestions(
  supabase: SupabaseClient,
  eventId: string | null,
): Promise<SurveyQuestion[]> {
  if (eventId) {
    const { data } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('event_id', eventId)
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (data && data.length > 0) return data as SurveyQuestion[];
  }
  const { data: def } = await supabase
    .from('survey_questions')
    .select('*')
    .is('event_id', null)
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (def && def.length > 0) return def as SurveyQuestion[];
  return DEFAULT_SURVEY_QUESTIONS;
}

// 답변이 코드 기본 Azure 6문항 세트와 매칭되는지 검사. 매칭되면 surveys 테이블의
// legacy q1~q6 컬럼에도 dual-write 해 기존 대시보드/엑셀 export 가 그대로 작동한다.
export function mapAnswersToLegacyColumns(answers: SurveyAnswer[]): {
  q1_azure_level: string | null;
  q2_difficulty: string | null;
  q3_purpose: string[] | null;
  q4_adoption: string | null;
  q5_consulting: string[] | null;
  q6_feedback: string;
} | null {
  // 텍스트 일치 기반 매핑 — DB rows 든 코드 fallback 이든 동일하게 작동
  const byText = new Map<string, SurveyAnswer>(answers.map((a) => [a.question_text.trim(), a]));
  const q1 = byText.get(DEFAULT_SURVEY_QUESTIONS[0].question_text);
  const q2 = byText.get(DEFAULT_SURVEY_QUESTIONS[1].question_text);
  const q3 = byText.get(DEFAULT_SURVEY_QUESTIONS[2].question_text);
  const q4 = byText.get(DEFAULT_SURVEY_QUESTIONS[3].question_text);
  const q5 = byText.get(DEFAULT_SURVEY_QUESTIONS[4].question_text);
  const q6 = byText.get(DEFAULT_SURVEY_QUESTIONS[5].question_text);

  // 정확한 기본 6문항 매칭이 아니면 null 반환 → JSONB 만 저장
  if (!q1 || !q2 || !q3 || !q4 || !q5) return null;

  return {
    q1_azure_level: typeof q1.value === 'string' ? q1.value : null,
    q2_difficulty: typeof q2.value === 'string' ? q2.value : null,
    q3_purpose: Array.isArray(q3.value) ? q3.value : null,
    q4_adoption: typeof q4.value === 'string' ? q4.value : null,
    q5_consulting: Array.isArray(q5.value) ? q5.value : null,
    q6_feedback: q6 && typeof q6.value === 'string' ? q6.value : '',
  };
}

// 신청자 응답 검증 — required 누락이나 잘못된 타입 등을 검출
export function validateAnswers(
  questions: SurveyQuestion[],
  answers: SurveyAnswer[],
): string | null {
  const byId = new Map(answers.map((a) => [a.question_id, a]));
  for (const q of questions) {
    if (!q.active) continue;
    const a = byId.get(q.id);
    if (q.required) {
      if (!a) return `필수 항목이 누락되었습니다: ${q.question_text}`;
      if (q.question_type === 'single' && (typeof a.value !== 'string' || !a.value.trim())) {
        return `필수 항목을 선택해주세요: ${q.question_text}`;
      }
      if (q.question_type === 'multiple' && (!Array.isArray(a.value) || a.value.length === 0)) {
        return `필수 항목을 하나 이상 선택해주세요: ${q.question_text}`;
      }
      if (q.question_type === 'text' && (typeof a.value !== 'string' || !a.value.trim())) {
        return `필수 항목을 입력해주세요: ${q.question_text}`;
      }
    }
  }
  return null;
}
