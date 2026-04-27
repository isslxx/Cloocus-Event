-- v28: 신청자 자가 취소(self-cancellation) 트래킹
-- deleted_at(휴지통)과 분리: 취소한 사람의 정보를 등록 리스트에 그대로 유지하면서
-- 취소 여부를 별도로 조회 가능하도록 함

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_event_registrations_cancelled_at
  ON event_registrations (cancelled_at)
  WHERE cancelled_at IS NOT NULL;
