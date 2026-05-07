-- v29: 이벤트별 커스텀 등록 문항
-- 공통 form_options(산업군/규모/경로/동의)는 그대로 모든 이벤트에 적용
-- 이 테이블은 특정 이벤트에만 추가로 노출되는 문항을 정의
--
-- question_type:
--   short_text     : 한 줄 입력
--   long_text      : 여러 줄 입력
--   single_choice  : 라디오 버튼 (옵션 중 1개 선택)
--   multi_choice   : 체크박스 (옵션 다중 선택)
--   agreement      : 단일 동의 체크박스 (label 자체가 동의 문구)
--
-- options (JSONB): single_choice / multi_choice 에서만 사용
--   예: [{"label": "옵션1"}, {"label": "옵션2"}]

CREATE TABLE IF NOT EXISTS event_custom_questions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('short_text', 'long_text', 'single_choice', 'multi_choice', 'agreement')),
  label         TEXT NOT NULL,
  description   TEXT,
  options       JSONB NOT NULL DEFAULT '[]'::jsonb,
  required      BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecq_event ON event_custom_questions(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ecq_active ON event_custom_questions(event_id, active);

-- service role 만 접근 (다른 admin 테이블과 동일 정책)
ALTER TABLE event_custom_questions ENABLE ROW LEVEL SECURITY;

-- 응답 저장: event_registrations 에 jsonb 컬럼 추가
-- 구조: { "<question_id>": "answer string"  |  ["a","b"]  |  true(agreement) }
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ecq_updated_at ON event_custom_questions;
CREATE TRIGGER set_ecq_updated_at
  BEFORE UPDATE ON event_custom_questions
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
