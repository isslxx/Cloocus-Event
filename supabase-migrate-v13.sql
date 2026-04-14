-- soft delete 컬럼 추가
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_er_deleted ON event_registrations(deleted_at);
