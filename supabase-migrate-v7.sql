-- ============================================
-- 클루커스 이벤트 v7 - 회사명 표준화 시스템
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. companies 테이블 확장 (기존 테이블 변경)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS official_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'verified'
    CHECK (status IN ('verified', 'unverified'));

-- normalized_name을 name에서 자동 생성하도록 유지
-- name = normalized_name (정규화된 이름)
-- official_name = 공식 표시명

-- 기존 데이터 official_name 채우기
UPDATE companies SET official_name = name WHERE official_name = '' OR official_name IS NULL;

-- 2. company_aliases 테이블 생성
CREATE TABLE IF NOT EXISTS company_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read aliases" ON company_aliases FOR SELECT USING (true);
CREATE POLICY "Admins can manage aliases" ON company_aliases FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_aliases_company ON company_aliases(company_id);
CREATE INDEX IF NOT EXISTS idx_aliases_name ON company_aliases(alias_name);

-- 3. companies 검색 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_companies_official ON companies(official_name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
