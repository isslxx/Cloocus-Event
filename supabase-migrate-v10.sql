-- ============================================
-- 폼 필드 옵션 관리 테이블
-- Supabase SQL Editor에서 실행
-- ============================================

CREATE TABLE form_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE form_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active options" ON form_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage options" ON form_options FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_form_options_field ON form_options(field_key, sort_order);

-- 기존 산업군 옵션 시드
INSERT INTO form_options (field_key, label, sort_order) VALUES
('industry', 'IT/통신', 1),
('industry', '게임', 2),
('industry', '제조/산업', 3),
('industry', '유통/물류', 4),
('industry', '헬스케어/바이오', 5),
('industry', '농축산업', 6),
('industry', '서비스', 7),
('industry', '금융', 8),
('industry', '에너지/자원', 9),
('industry', '공공/교육', 10),
('industry', '미디어/엔터테인먼트', 11),
('industry', '건설/부동산', 12),
('industry', '기타', 13);

-- 기존 기업 규모 옵션 시드
INSERT INTO form_options (field_key, label, sort_order) VALUES
('company_size', '1~9명', 1),
('company_size', '10~49명', 2),
('company_size', '50~249명', 3),
('company_size', '250~499명', 4),
('company_size', '500~999명', 5),
('company_size', '1,000~4,999명', 6),
('company_size', '5,000명 이상', 7);

-- 기존 신청 경로 옵션 시드
INSERT INTO form_options (field_key, label, sort_order) VALUES
('referral_source', '클루커스 이메일', 1),
('referral_source', '클루커스 홈페이지', 2),
('referral_source', '클루커스 SNS', 3),
('referral_source', '클루커스 담당자 소개', 4),
('referral_source', '외부 담당자 소개', 5),
('referral_source', 'IT 미디어 매체', 6),
('referral_source', '협회 및 공기관 이메일/뉴스레터', 7),
('referral_source', 'PR기사', 8),
('referral_source', '기타', 9);
