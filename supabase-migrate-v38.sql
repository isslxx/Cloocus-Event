-- v38: 설문조사 동적화 — answers JSONB 컬럼 추가
--
-- 배경: 페이지 관리 > 설문 폼(survey_questions 테이블)은 이벤트별 설문 질문을
-- 자유롭게 편집할 수 있지만, 신청자 포탈의 설문 폼은 Azure 6문항이 코드에
-- 하드코딩돼 있어 admin 편집 결과가 반영되지 않았다. 이를 동적으로 만들기
-- 위해 surveys 테이블에 generic 응답을 담는 JSONB 컬럼을 추가한다.
--
-- 호환성:
-- - 기존 q1_azure_level ~ q6_feedback 컬럼은 유지한다(과거 데이터/기본 설문
--   대시보드/엑셀 export 호환). NOT NULL 제약은 풀어서 비-기본 설문도 저장
--   가능하게 한다.
-- - 신규 응답은 answers JSONB 에 항상 기록한다. 기본 6문항(Azure)인 경우에는
--   q1~q6 컬럼에도 매핑 저장한다(legacy 대시보드 호환).
--
-- answers 포맷:
--   [{ question_id: uuid, question_text: text, question_type: 'single'|'multiple'|'text', value: string|string[] }, ...]

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE surveys ALTER COLUMN q1_azure_level DROP NOT NULL;
ALTER TABLE surveys ALTER COLUMN q2_difficulty  DROP NOT NULL;
ALTER TABLE surveys ALTER COLUMN q3_purpose     DROP NOT NULL;
ALTER TABLE surveys ALTER COLUMN q4_adoption    DROP NOT NULL;
ALTER TABLE surveys ALTER COLUMN q5_consulting  DROP NOT NULL;
