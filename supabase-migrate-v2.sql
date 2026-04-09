-- ============================================
-- 클루커스 이벤트 v2 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. events 테이블 생성
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('online', 'offline')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read open events"
  ON events FOR SELECT USING (true);

CREATE POLICY "Admins can manage events"
  ON events FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

-- 2. event_registrations에 event_id 컬럼 추가
ALTER TABLE event_registrations
  ADD COLUMN event_id UUID REFERENCES events(id);

CREATE INDEX idx_er_event ON event_registrations(event_id);

-- 3. 기본 이벤트 추가 (예시)
INSERT INTO events (name, event_date, event_type, status)
VALUES ('4/28(화) 스프린트 - Azure 인프라 입문', '2026-04-28', 'offline', 'open');
