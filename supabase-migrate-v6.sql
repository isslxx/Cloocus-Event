-- ============================================
-- 클루커스 이벤트 v6 - 이메일 중복 등록 허용
-- Supabase SQL Editor에서 실행
-- ============================================

ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_email_key;
