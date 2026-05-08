-- v33: 객관식 문항에 "기타" 옵션 포함 여부 토글
-- single_choice / multi_choice 일 때 관리자가 켜두면, 신청자 폼에 자동으로 '기타'
-- 선택지가 추가되고 선택 시 텍스트 입력란이 노출됨. 응답은 '기타: <텍스트>' 형태로 저장.
-- (산업군/신청 경로의 기타 처리 방식과 동일한 컨벤션)

ALTER TABLE event_custom_questions
  ADD COLUMN IF NOT EXISTS allow_etc BOOLEAN NOT NULL DEFAULT FALSE;
