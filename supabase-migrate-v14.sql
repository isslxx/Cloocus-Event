-- v14: 등록 시 개인 확인용 4자리 PIN 추가
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS pin TEXT;
