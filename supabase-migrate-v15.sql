-- v15: 이벤트 카테고리, 등록 상태, FAQ 테이블 추가

-- 이벤트 카테고리
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '이벤트';

-- 등록 상태 (pending/confirmed/rejected)
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';

-- FAQ 테이블
CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
