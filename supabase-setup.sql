-- ============================================
-- 클루커스 이벤트 등록 시스템 - Supabase SQL
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. event_registrations
CREATE TABLE event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_name_raw TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  referral_source TEXT NOT NULL,
  referrer_name TEXT DEFAULT '',
  inquiry TEXT DEFAULT '',
  privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register"
  ON event_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read"
  ON event_registrations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update"
  ON event_registrations FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete"
  ON event_registrations FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_er_email ON event_registrations(email);
CREATE INDEX idx_er_company ON event_registrations(company_name);
CREATE INDEX idx_er_created ON event_registrations(created_at DESC);
CREATE INDEX idx_er_industry ON event_registrations(industry);
CREATE INDEX idx_er_source ON event_registrations(referral_source);

-- 2. companies (자동완성용)
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read companies"
  ON companies FOR SELECT USING (true);

CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL USING (auth.role() = 'authenticated');

-- 3. admin_users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read admin_users"
  ON admin_users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. audit_log
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL DEFAULT 'event_registrations',
  target_id UUID NOT NULL,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit_log"
  ON audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX idx_audit_target ON audit_log(target_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 5. 트리거: 등록 시 companies 자동 추가
CREATE OR REPLACE FUNCTION sync_company_from_registration()
RETURNS trigger AS $$
BEGIN
  INSERT INTO companies (name)
  VALUES (NEW.company_name)
  ON CONFLICT (name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_company
  AFTER INSERT ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION sync_company_from_registration();

-- 6. 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
