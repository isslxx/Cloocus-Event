-- v22: FAQ 카테고리 시스템 추가

-- 카테고리 테이블
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- faqs 테이블에 category_id FK 추가
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_faq_categories_sort ON faq_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON faqs(category_id);

-- 기본 카테고리 3개 생성
INSERT INTO faq_categories (name, icon, sort_order) VALUES
  ('등록/참여', '📋', 1),
  ('일정/장소', '📍', 2),
  ('기타 안내', '💡', 3);
