-- v27: 페이지 이벤트 로그(노출/클릭) + 익명 user_id 도입
-- P1.5 데이터 인프라 — 시각화는 후속(2~4주 후) 축적된 데이터로 추가 예정

-- 1. event_registrations에 익명 user_id 추가
--    클라이언트가 localStorage로 발급한 user_id를 등록 시점에 기록하여
--    "등록 전 페이지 행동" ↔ "등록" 을 JOIN 가능하게 함
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON event_registrations (user_id)
  WHERE user_id IS NOT NULL;

-- 2. page_events 테이블 신설
CREATE TABLE IF NOT EXISTS page_events (
  id           bigserial PRIMARY KEY,
  session_id   text NOT NULL,
  user_id      text,
  event_id     uuid REFERENCES events(id) ON DELETE SET NULL,
  page         text NOT NULL,
  action_type  text NOT NULL CHECK (action_type IN ('view', 'click')),
  element_id   text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  referrer_url text,
  landing_page text,
  device_type  text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_events_created     ON page_events (created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_event       ON page_events (event_id, created_at) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_events_session     ON page_events (session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_user        ON page_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_events_action_day  ON page_events (action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_page        ON page_events (page);

-- 3. RLS 활성화 (v25 패턴과 동일 — service role만 접근)
ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;
