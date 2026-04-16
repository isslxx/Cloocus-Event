-- v20: 수료증 발급 추적
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;
