-- v26: UTM 파라미터 및 유입 정보 추적 컬럼 추가
-- 마케팅 대시보드의 채널별 어트리뷰션 분석을 위한 P0 데이터 인프라

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content  text,
  ADD COLUMN IF NOT EXISTS utm_term     text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer_url text;

CREATE INDEX IF NOT EXISTS idx_event_registrations_utm_source   ON event_registrations (utm_source)   WHERE utm_source   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_utm_medium   ON event_registrations (utm_medium)   WHERE utm_medium   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_utm_campaign ON event_registrations (utm_campaign) WHERE utm_campaign IS NOT NULL;
