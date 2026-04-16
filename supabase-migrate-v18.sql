-- v18: 설문조사 시스템
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS survey_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  q1_azure_level TEXT NOT NULL,
  q2_difficulty TEXT NOT NULL,
  q3_purpose TEXT[] NOT NULL,
  q4_adoption TEXT NOT NULL,
  q5_consulting TEXT[] NOT NULL,
  q6_feedback TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_registration_id ON surveys(registration_id);
