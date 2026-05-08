import type { SupabaseClient } from '@supabase/supabase-js';

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'agreement';

type QuestionRow = {
  id: string;
  question_type: QuestionType;
  label: string;
  options: { label: string }[];
  required: boolean;
  allow_etc: boolean;
  active: boolean;
};

const ETC_LABEL = '기타';
const ETC_PREFIX = '기타: ';
const ETC_TEXT_MAX = 500;

// "기타" 또는 "기타: <텍스트>" 인지 판별. 후자면 텍스트 길이 제한 적용.
function normalizeEtc(s: string): string | null {
  if (s === ETC_LABEL) return ETC_LABEL;
  if (s.startsWith(ETC_PREFIX)) {
    const text = s.slice(ETC_PREFIX.length).trim().slice(0, ETC_TEXT_MAX);
    return text ? `${ETC_PREFIX}${text}` : ETC_LABEL;
  }
  return null;
}

export type CustomAnswerValue = string | string[] | boolean;

/**
 * 활성 문항 정의를 기준으로 응답을 검증·정규화하여 저장 가능한 JSONB 형태로 반환.
 * - 활성 문항만 받음 (비활성 문항 응답은 폐기)
 * - 필수인데 비어있으면 첫 오류 메시지로 반환
 * - 단일/복수 선택은 정의된 옵션 라벨 외의 값은 거름
 * - 텍스트는 트림 + 4000자 제한
 */
export async function validateAndPrepareCustomAnswers(
  supabase: SupabaseClient,
  eventId: string | null,
  raw: unknown
): Promise<{ ok: true; value: Record<string, CustomAnswerValue> } | { ok: false; error: string }> {
  const answersIn = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};

  if (!eventId) return { ok: true, value: {} };

  const { data } = await supabase
    .from('event_custom_questions')
    .select('id, question_type, label, options, required, allow_etc, active')
    .eq('event_id', eventId)
    .eq('active', true);

  const questions: QuestionRow[] = Array.isArray(data) ? data as QuestionRow[] : [];
  const out: Record<string, CustomAnswerValue> = {};

  for (const q of questions) {
    const v = answersIn[q.id];
    const optionLabels = (q.options || []).map((o) => o.label);

    if (q.question_type === 'short_text' || q.question_type === 'long_text') {
      const s = typeof v === 'string' ? v.trim().slice(0, 4000) : '';
      if (q.required && !s) return { ok: false, error: `[추가 문항] ${q.label}: 필수 입력 항목입니다.` };
      out[q.id] = s;
      continue;
    }

    if (q.question_type === 'single_choice') {
      const s = typeof v === 'string' ? v.trim() : '';
      let valid = '';
      if (optionLabels.includes(s)) {
        valid = s;
      } else if (q.allow_etc) {
        const etc = normalizeEtc(s);
        if (etc) {
          // 기타를 골랐는데 본문이 비어있으면 거부 (기타: 만 있어도 의미 없음)
          if (etc === ETC_LABEL) return { ok: false, error: `[추가 문항] ${q.label}: 기타 내용을 입력해주세요.` };
          valid = etc;
        }
      }
      if (q.required && !valid) return { ok: false, error: `[추가 문항] ${q.label}: 선택해주세요.` };
      out[q.id] = valid;
      continue;
    }

    if (q.question_type === 'multi_choice') {
      const rawArr = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      const arr: string[] = [];
      let etcEmpty = false;
      for (const item of rawArr) {
        if (optionLabels.includes(item)) { arr.push(item); continue; }
        if (q.allow_etc) {
          const etc = normalizeEtc(item);
          if (etc === ETC_LABEL) { etcEmpty = true; continue; }
          if (etc) { arr.push(etc); continue; }
        }
        // 그 외 값은 silently 폐기 (정의되지 않은 옵션)
      }
      if (etcEmpty) return { ok: false, error: `[추가 문항] ${q.label}: 기타 내용을 입력해주세요.` };
      if (q.required && arr.length === 0) return { ok: false, error: `[추가 문항] ${q.label}: 1개 이상 선택해주세요.` };
      out[q.id] = arr;
      continue;
    }

    if (q.question_type === 'agreement') {
      const checked = v === true;
      if (q.required && !checked) return { ok: false, error: `[추가 문항] ${q.label}: 동의가 필요합니다.` };
      out[q.id] = checked;
      continue;
    }
  }

  return { ok: true, value: out };
}
