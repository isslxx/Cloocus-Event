-- ============================================
-- 클루커스 이벤트 v3 마이그레이션 - 이메일 발송 추적
-- Supabase SQL Editor에서 실행
-- ============================================

-- event_registrations에 이메일 발송 상태 컬럼 추가
ALTER TABLE event_registrations
  ADD COLUMN email_status TEXT DEFAULT NULL
    CHECK (email_status IN ('confirmed', 'rejected', NULL));

ALTER TABLE event_registrations
  ADD COLUMN email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- events에 장소, 시간 컬럼 추가
ALTER TABLE events
  ADD COLUMN location TEXT DEFAULT '';

ALTER TABLE events
  ADD COLUMN event_time TEXT DEFAULT '';
