-- v35: 홈 카드 리디자인 (Premium AI Experience) 지원 컬럼
-- - summary: 카드에 노출되는 1~2줄 짧은 소개 (선택)
-- - event_date_end: 2일 이상 연속 이벤트의 종료 날짜 (선택)
--   * NULL 이면 단일일 이벤트로 처리
--   * 프로모션 카테고리는 event_date 를 마감 기한으로 사용하므로 보통 비워둠

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS event_date_end DATE;
