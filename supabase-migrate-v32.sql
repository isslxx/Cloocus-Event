-- v32: utm_id 캡처
-- GA4 가 자동으로 utm_id 를 잡아주는 것과 별개로, 앱 내부 추적/관리자 대시보드에서도
-- utm_id 를 디멘션으로 활용할 수 있도록 두 트래킹 테이블에 컬럼 추가.

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS utm_id TEXT;

ALTER TABLE page_events
  ADD COLUMN IF NOT EXISTS utm_id TEXT;

-- 분석 쿼리 가속용 부분 인덱스 (NULL 제외)
CREATE INDEX IF NOT EXISTS idx_event_registrations_utm_id
  ON event_registrations (utm_id)
  WHERE utm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_events_utm_id
  ON page_events (utm_id)
  WHERE utm_id IS NOT NULL;
