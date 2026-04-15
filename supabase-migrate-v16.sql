-- v16: event_type에 'none' 허용 (CHECK 제약 해제)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check CHECK (event_type IN ('online', 'offline', 'none'));
