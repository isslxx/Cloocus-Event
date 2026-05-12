-- v36: 소셜 프루프(실시간 활성도) 운영 설정
-- - admin_settings: 단일 행 운영 설정 테이블 (id=1)
-- - 배지 ON/OFF, 이모지 위치, 톤별 문구, 임계값, 상단 카운터 옵션, D-day 칩 옵션
--
-- 1차 적용 시점: 본 적용 PR
-- 후속 작업: 게이팅(한 화면 라이브 배지 최대 N개), A/B 문구 슬롯 등

CREATE TABLE IF NOT EXISTS admin_settings (
  id INT PRIMARY KEY DEFAULT 1,

  -- 소셜 프루프 배지
  social_proof_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  social_proof_emoji_position TEXT NOT NULL DEFAULT 'end'
    CHECK (social_proof_emoji_position IN ('none', 'end')),

  -- 톤별 문구 — 운영 중 admin에서 즉시 교체 가능
  social_proof_labels JSONB NOT NULL DEFAULT '{
    "urgent":  "마감 임박 · 신청 증가 중",
    "hot":     "실시간 인기 급상승",
    "rising":  "방금 신청이 빠르게 늘고 있어요",
    "live":    "10명 이상이 동시 접속 중",
    "popular": "현재 가장 많이 조회되는 이벤트"
  }'::jsonb,

  -- 임계값 (히스테리시스는 서버 계산에서 적용)
  social_proof_thresholds JSONB NOT NULL DEFAULT '{
    "live_min": 10,
    "rising_recent_min": 5,
    "rising_window_minutes": 15,
    "hot_multiplier": 2.0,
    "urgent_dday_within": 2,
    "urgent_capacity_pct": 0.8
  }'::jsonb,

  -- 페이지 상단 라이브 카운터
  top_live_counter_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  top_live_counter_min INT NOT NULL DEFAULT 3,

  -- D-day 칩
  dday_chip_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_settings_singleton CHECK (id = 1)
);

-- 기본 행 보장 (이미 있으면 무시)
INSERT INTO admin_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- RLS: 다른 테이블들과 동일한 패턴 — 정책 없이 RLS 만 켜서
-- anon/authenticated 클라이언트의 직접 접근을 차단. 서버사이드는
-- SERVICE_ROLE_KEY 로 접근하므로 RLS 를 bypass 한다.
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
