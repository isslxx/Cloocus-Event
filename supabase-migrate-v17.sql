-- v17: 성능 개선을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at ON event_registrations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON event_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_industry ON event_registrations(industry);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON event_registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_visible ON events(visible);
