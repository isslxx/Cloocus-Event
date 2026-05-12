'use client';

/**
 * 소셜 프루프 (실시간 활성도) — 신청자 포털 첫 화면 적용
 *
 * - SocialProofBadge: 카테고리 옆 배지 (텍스트 + 테두리, 라이브 신호엔 좌측 도트)
 * - DDayChip: 메타 라인 끝의 D-day 칩
 * - TopLiveCounter: 페이지 상단 라이브 카운터 (3명 미만 자동 숨김)
 * - useEngagement: /api/engagement polling 훅 (20s)
 */

import { useEffect, useState } from 'react';

// ============================================================
// 톤 팔레트 (CSS 변수 주입)
// ============================================================
export type Tone = 'urgent' | 'hot' | 'rising' | 'live' | 'popular';

const TONE_COLOR: Record<
  Tone,
  { fg: string; line: string; dot: string; emoji: string; usesPulse: boolean }
> = {
  urgent:  { fg: '#b91c1c', line: 'rgba(220, 38, 38, 0.32)', dot: '#dc2626', emoji: '⏰', usesPulse: true  },
  hot:     { fg: '#047857', line: 'rgba(16, 185, 129, 0.32)', dot: '#10b981', emoji: '🔥', usesPulse: true  },
  rising:  { fg: '#b45309', line: 'rgba(180, 83, 9, 0.28)',   dot: '#d97706', emoji: '📈', usesPulse: false },
  live:    { fg: '#1d4ed8', line: 'rgba(37, 99, 235, 0.30)',  dot: '#2563eb', emoji: '✨', usesPulse: true  },
  popular: { fg: '#6d28d9', line: 'rgba(124, 58, 237, 0.30)', dot: '#7c3aed', emoji: '👀', usesPulse: false },
};

const DEFAULT_LABELS: Record<Tone, string> = {
  urgent:  '마감 임박 · 신청 증가 중',
  hot:     '실시간 인기 급상승',
  rising:  '방금 신청이 빠르게 늘고 있어요',
  live:    '10명 이상이 동시 접속 중',
  popular: '현재 가장 많이 조회되는 이벤트',
};

function formatLabel(tone: Tone, label: string, count?: number): string {
  if (count == null) return label;
  if (tone === 'live') return `${count}+명 동시 접속 중`;
  if (tone === 'rising' || tone === 'hot') return `최근 ${count}건 신청`;
  return label;
}

// ============================================================
// 배지
// ============================================================
export function SocialProofBadge({
  tone, label, count, emojiPos,
}: {
  tone: Tone;
  label?: string;
  count?: number;
  emojiPos: 'none' | 'end';
}) {
  const c = TONE_COLOR[tone];
  const displayLabel = formatLabel(tone, label ?? DEFAULT_LABELS[tone], count);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        color: c.fg,
        background: 'transparent',
        border: `1px solid ${c.line}`,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.005em',
        verticalAlign: 'middle',
      }}
    >
      {c.usesPulse && (
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: c.dot,
            flexShrink: 0,
            opacity: 0.95,
            animation: 'sp-breath 2.6s ease-in-out infinite',
            display: 'inline-block',
          }}
        />
      )}
      <span>{displayLabel}</span>
      {emojiPos === 'end' && (
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, marginLeft: 1 }}>{c.emoji}</span>
      )}
    </span>
  );
}

// ============================================================
// D-day 칩 (메타 라인)
// ============================================================
export function DDayChip({ eventDate }: { eventDate: string }) {
  const dday = daysUntilKST(eventDate);
  if (dday == null || dday < 0) return null; // 지난 일정은 표시 안 함

  let label: string;
  let palette: { fg: string; line: string };
  if (dday === 0) {
    label = '오늘 마감';
    palette = { fg: '#b91c1c', line: 'rgba(220,38,38,0.32)' };
  } else if (dday <= 2) {
    label = `D-${dday}`;
    palette = { fg: '#b91c1c', line: 'rgba(220,38,38,0.32)' };
  } else if (dday <= 7) {
    label = `D-${dday}`;
    palette = { fg: '#b45309', line: 'rgba(180,83,9,0.28)' };
  } else {
    label = `D-${dday}`;
    palette = { fg: '#6b7280', line: 'rgba(107,114,128,0.28)' };
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: palette.fg,
        border: `1px solid ${palette.line}`,
        borderRadius: 999,
        padding: '1px 7px',
        letterSpacing: '0.015em',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

// ============================================================
// 상단 라이브 카운터
// ============================================================
export function TopLiveCounter({ count, min = 3 }: { count: number; min?: number }) {
  if (count < min) return null;
  return (
    <div
      className="sp-toplive"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12,
        color: '#374151',
        background: 'rgba(243, 244, 246, 0.9)',
        border: '1px solid rgba(209, 213, 219, 0.9)',
        borderRadius: 999,
        padding: '5px 12px',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <span
        className="sp-toplive-dot"
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: '#2563eb',
          animation: 'sp-breath 2.6s ease-in-out infinite',
          display: 'inline-block',
        }}
      />
      <span>지금 <b style={{ color: '#111827', fontWeight: 700 }}>{count}명</b>이 이벤트를 둘러보는 중</span>
    </div>
  );
}

// ============================================================
// Polling 훅 (/api/engagement, 20s)
// ============================================================
export type EngagementSettings = {
  enabled: boolean;
  emoji_position: 'none' | 'end';
  labels: Record<Tone, string>;
  top_live_counter_enabled: boolean;
  top_live_counter_min: number;
  dday_chip_enabled: boolean;
};

export type EngagementData = {
  settings: EngagementSettings;
  page: { active_viewers: number };
  events: { event_id: string; tone: Tone | null; count?: number }[];
};

const DEFAULT_ENGAGEMENT: EngagementData = {
  settings: {
    enabled: true,
    emoji_position: 'end',
    labels: DEFAULT_LABELS,
    top_live_counter_enabled: true,
    top_live_counter_min: 3,
    dday_chip_enabled: true,
  },
  page: { active_viewers: 0 },
  events: [],
};

export function useEngagement(intervalMs = 20_000): EngagementData {
  const [data, setData] = useState<EngagementData>(DEFAULT_ENGAGEMENT);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = () => {
      fetch('/api/engagement')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (!cancelled && d) setData(d);
        })
        .catch(() => {});
    };
    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);

    // 탭 활성화 시 즉시 갱신
    const onVisible = () => { if (document.visibilityState === 'visible') fetchOnce(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return data;
}

// ============================================================
// Helpers
// ============================================================
function daysUntilKST(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00+09:00');
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstNowDate = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
  const diffMs = target.getTime() - kstNowDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
