-- v30: 이벤트별 "추가 문항 섹션 제목" 커스터마이징
-- 신청자 폼에서 추가 문항 박스 위에 표시되는 제목.
-- NULL 일 경우 코드에서 '맞춤 혜택 안내를 위한 추가 정보' 기본값으로 폴백.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS custom_questions_section_title TEXT NULL;
