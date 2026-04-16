-- v19: 이벤트별 설문조사 질문 관리 테이블
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single',
  options TEXT[] DEFAULT '{}',
  required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_event_id ON survey_questions(event_id);

-- event_id가 NULL이면 기본 설문조사
