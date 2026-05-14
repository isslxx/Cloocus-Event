-- v37: 내부 IP에서 발생한 테스트 등록을 통계에서 제외하기 위한 플래그
--
-- /api/register 가 요청 IP를 검사해 internal-ip 목록(lib/internal-ip.ts)에 매칭되면
-- is_internal=true 로 저장한다. 실제 등록 데이터는 그대로 보존되지만, 대시보드
-- 통계 쿼리는 is_internal=true 행을 기본 제외해 진짜 고객 데이터만 본다.

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- 대시보드 집계가 is_internal=false 조건을 자주 거니까 부분 인덱스로 가속.
-- false 가 압도적으로 많을 거라 부분 인덱스 효율은 크지 않을 수 있지만
-- 안전하게 일반 인덱스로 두지 않고 보조 인덱스만 추가.
CREATE INDEX IF NOT EXISTS idx_event_registrations_internal
  ON event_registrations (is_internal)
  WHERE is_internal = true;

-- 과거 내부 테스트 데이터 backfill: @cloocus.com 도메인은 명백한 내부 계정
UPDATE event_registrations
SET is_internal = true
WHERE email ILIKE '%@cloocus.com'
  AND deleted_at IS NULL;
