-- v23: 문의 대응 시스템 (inquiry comments + status)

-- 문의 코멘트 테이블
CREATE TABLE IF NOT EXISTS inquiry_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('admin', 'applicant')),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 등록 테이블에 문의 상태 컬럼 추가
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS inquiry_status TEXT DEFAULT 'pending';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiry_comments_reg ON inquiry_comments(registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_inquiry_status ON event_registrations(inquiry_status);
