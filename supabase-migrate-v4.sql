-- ============================================
-- 클루커스 이벤트 v4 마이그레이션 - 이메일 발송 로그
-- Supabase SQL Editor에서 실행
-- ============================================

CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES event_registrations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('confirmed', 'rejected')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT DEFAULT '',
  sent_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email_logs"
  ON email_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert email_logs"
  ON email_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX idx_email_logs_reg ON email_logs(registration_id);
CREATE INDEX idx_email_logs_event ON email_logs(event_id);
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);
