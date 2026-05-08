-- v34: 프로모션 카테고리 이벤트의 외부 랜딩 URL
-- 관리자가 이벤트 생성/수정 시 입력하면, 신청자 등록 페이지의 이벤트 정보 영역에
-- "프로모션 상세보기" 링크가 노출되어 새 창으로 랜딩 페이지를 열 수 있게 함.
-- 홈 카드/캐러셀에는 노출하지 않음.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS promo_url TEXT;
