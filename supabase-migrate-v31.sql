-- v31: 이벤트별 URL slug
-- 신청자 포탈에서 이벤트별로 고유 URL(/[slug])을 갖도록 slug 컬럼 추가.
-- 형식: YYYYMMDD (event_date 기준), 동일 날짜에 둘 이상이면 -2, -3 ... 자동 부여.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 기존 레코드 백필: created_at 순서대로 첫 번째는 그대로, 이후는 -2, -3 …
WITH numbered AS (
  SELECT
    id,
    TO_CHAR(event_date, 'YYYYMMDD') AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY TO_CHAR(event_date, 'YYYYMMDD')
      ORDER BY created_at, id
    ) AS rn
  FROM events
  WHERE slug IS NULL
)
UPDATE events e
SET slug = CASE
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn::text
END
FROM numbered n
WHERE e.id = n.id;

-- 동일 slug 중복 방지 (NULL 은 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON events(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_slug
  ON events(slug);
