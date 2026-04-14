-- ============================================
-- 개인정보 동의 카테고리별 관리
-- Supabase SQL Editor에서 실행
-- ============================================

CREATE TABLE privacy_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read privacy" ON privacy_policies FOR SELECT USING (true);
CREATE POLICY "Admins can manage privacy" ON privacy_policies FOR ALL USING (auth.role() = 'authenticated');

-- 기본 카테고리 시드
INSERT INTO privacy_policies (category, content) VALUES
('MS', '[개인정보 수집 및 이용 동의 - Microsoft 행사]

1. 수집 항목: 성함, 회사명, 부서명, 직급, 업무용 이메일 주소, 핸드폰 연락처, 산업군, 기업 규모, 신청 경로, 추천인 성명, 문의사항

2. 수집 목적: Microsoft 관련 이벤트 등록 및 참석 관리, 행사 안내 및 관련 정보 제공, 마케팅 활용

3. 개인정보 보유 및 이용 기간: 수신 동의 철회 시 까지

4. 개인정보 제 3자 제공 및 위탁:
귀하의 개인정보는 신청한 서비스 상담 및 관련 상품, 세미나 정보 제공 등과 관련하여 클루커스 및 Microsoft의 정책 상 파트너의 지위를 가지는 자에 제공되어 처리될 수 있습니다.

5. 동의 거부 시 이벤트 등록이 제한될 수 있습니다.

※ 위 개인정보 수집 및 이용에 동의합니다.'),

('GCP', '[개인정보 수집 및 이용 동의 - Google Cloud 행사]

1. 수집 항목: 성함, 회사명, 부서명, 직급, 업무용 이메일 주소, 핸드폰 연락처, 산업군, 기업 규모, 신청 경로, 추천인 성명, 문의사항

2. 수집 목적: Google Cloud 관련 이벤트 등록 및 참석 관리, 행사 안내 및 관련 정보 제공, 마케팅 활용

3. 개인정보 보유 및 이용 기간: 수신 동의 철회 시 까지

4. 개인정보 제 3자 제공 및 위탁:
귀하의 개인정보는 신청한 서비스 상담 및 관련 상품, 세미나 정보 제공 등과 관련하여 클루커스 및 Google Cloud의 정책 상 파트너의 지위를 가지는 자에 제공되어 처리될 수 있습니다.

5. 동의 거부 시 이벤트 등록이 제한될 수 있습니다.

※ 위 개인정보 수집 및 이용에 동의합니다.'),

('NCP', '[개인정보 수집 및 이용 동의 - Naver Cloud 행사]

1. 수집 항목: 성함, 회사명, 부서명, 직급, 업무용 이메일 주소, 핸드폰 연락처, 산업군, 기업 규모, 신청 경로, 추천인 성명, 문의사항

2. 수집 목적: Naver Cloud 관련 이벤트 등록 및 참석 관리, 행사 안내 및 관련 정보 제공, 마케팅 활용

3. 개인정보 보유 및 이용 기간: 수신 동의 철회 시 까지

4. 개인정보 제 3자 제공 및 위탁:
귀하의 개인정보는 신청한 서비스 상담 및 관련 상품, 세미나 정보 제공 등과 관련하여 클루커스 및 Naver Cloud의 정책 상 파트너의 지위를 가지는 자에 제공되어 처리될 수 있습니다.

5. 동의 거부 시 이벤트 등록이 제한될 수 있습니다.

※ 위 개인정보 수집 및 이용에 동의합니다.'),

('기타', '[개인정보 수집 및 이용 동의]

1. 수집 항목: 성함, 회사명, 부서명, 직급, 업무용 이메일 주소, 핸드폰 연락처, 산업군, 기업 규모, 신청 경로, 추천인 성명, 문의사항

2. 수집 목적: 이벤트 등록 및 참석 관리, 행사 안내 및 관련 정보 제공, 마케팅 활용

3. 개인정보 보유 및 이용 기간: 수신 동의 철회 시 까지

4. 개인정보 제 3자 제공 및 위탁:
귀하의 개인정보는 신청한 서비스 상담 및 관련 상품, 세미나 정보 제공 등과 관련하여 클루커스의 정책 상 파트너의 지위를 가지는 자에 제공되어 처리될 수 있습니다.

5. 동의 거부 시 이벤트 등록이 제한될 수 있습니다.

※ 위 개인정보 수집 및 이용에 동의합니다.');

-- events에 privacy_category 컬럼 추가
ALTER TABLE events ADD COLUMN IF NOT EXISTS privacy_category TEXT DEFAULT '기타';
