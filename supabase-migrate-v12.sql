-- 개인정보 동의 제목 컬럼 추가
ALTER TABLE privacy_policies ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '개인정보 수집 및 이용 동의';
