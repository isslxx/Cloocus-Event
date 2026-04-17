-- v21: 이벤트 상태 3종 (open/closed/ended) + 종료일 기록
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('open', 'closed', 'ended'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
