/**
 * GET /api/engagement
 *
 * 신청자 포털 첫 화면의 실시간 활성도 신호를 한 번에 응답.
 *
 * Response shape:
 * {
 *   settings: {
 *     enabled: boolean,                    // 배지 전체 ON/OFF
 *     emoji_position: 'none' | 'end',
 *     labels: { [tone]: string },
 *     top_live_counter_enabled: boolean,
 *     top_live_counter_min: number,
 *     dday_chip_enabled: boolean,
 *   },
 *   page: { active_viewers: number },      // 상단 라이브 카운터용
 *   events: [{ event_id, tone, count }],   // event 별 우선순위 1개 톤
 * }
 *
 * 1차: 폴링(클라 20s 주기). 부하 보고 후 presence/realtime 으로 승급 가능.
 *
 * 신호 우선순위 (서버에서 1개로 압축해 내려보냄):
 *   1) urgent  — capacity 80%↑ 채워졌고 D-day ≤ urgent_dday_within
 *   2) hot     — 최근 신청수 ≥ rising_recent_min × hot_multiplier
 *   3) rising  — 최근 신청수 ≥ rising_recent_min
 *   4) live    — 현재 동시 viewer ≥ live_min
 *   5) popular — 같은 페이지 내 최근 1h 조회 1위 (1개 이벤트만)
 */

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-auth';

type Tone = 'urgent' | 'hot' | 'rising' | 'live' | 'popular';

const DEFAULT_LABELS: Record<Tone, string> = {
  urgent:  '마감 임박 · 신청 증가 중',
  hot:     '실시간 인기 급상승',
  rising:  '방금 신청이 빠르게 늘고 있어요',
  live:    '10명 이상이 동시 접속 중',
  popular: '현재 가장 많이 조회되는 이벤트',
};

const DEFAULT_THRESHOLDS = {
  live_min: 10,
  rising_recent_min: 5,
  rising_window_minutes: 15,
  hot_multiplier: 2.0,
  urgent_dday_within: 2,
  urgent_capacity_pct: 0.8,
};

const DEFAULT_SETTINGS = {
  enabled: true,
  emoji_position: 'end' as 'none' | 'end',
  labels: DEFAULT_LABELS,
  thresholds: DEFAULT_THRESHOLDS,
  top_live_counter_enabled: true,
  top_live_counter_min: 3,
  dday_chip_enabled: true,
};

function daysUntilKST(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00+09:00');
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstNowDate = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
  const diffMs = target.getTime() - kstNowDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const supabase = getServiceSupabase();

  // 1. 운영 설정 로드 (테이블 없거나 행 없으면 default)
  let settings = DEFAULT_SETTINGS;
  try {
    const { data: s } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (s) {
      settings = {
        enabled: s.social_proof_enabled ?? true,
        emoji_position: (s.social_proof_emoji_position ?? 'end') as 'none' | 'end',
        labels: { ...DEFAULT_LABELS, ...(s.social_proof_labels ?? {}) },
        thresholds: { ...DEFAULT_THRESHOLDS, ...(s.social_proof_thresholds ?? {}) },
        top_live_counter_enabled: s.top_live_counter_enabled ?? true,
        top_live_counter_min: s.top_live_counter_min ?? 3,
        dday_chip_enabled: s.dday_chip_enabled ?? true,
      };
    }
  } catch {
    // 마이그레이션 전이면 default 로 동작
  }

  // 기능 전체 OFF 면 최소 응답
  if (!settings.enabled) {
    return NextResponse.json({
      settings,
      page: { active_viewers: 0 },
      events: [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const th = settings.thresholds;
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const recentWindowAgo = new Date(now - th.rising_window_minutes * 60 * 1000).toISOString();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  // 2. 동시 viewer (5분 내, action=view, event_id 별 distinct session)
  const { data: viewerRows } = await supabase
    .from('page_events')
    .select('event_id, session_id')
    .eq('action_type', 'view')
    .gt('created_at', fiveMinAgo);

  const eventViewers = new Map<string, Set<string>>();
  const pageSessions = new Set<string>();
  (viewerRows ?? []).forEach((r) => {
    if (r.session_id) pageSessions.add(r.session_id);
    if (r.event_id && r.session_id) {
      const s = eventViewers.get(r.event_id) ?? new Set<string>();
      s.add(r.session_id);
      eventViewers.set(r.event_id, s);
    }
  });
  const pageActiveViewers = pageSessions.size;

  // 3. 최근 신청수 (rising/hot 판정용)
  const { data: signupRows } = await supabase
    .from('event_registrations')
    .select('event_id')
    .gt('created_at', recentWindowAgo)
    .not('event_id', 'is', null);

  const recentSignups = new Map<string, number>();
  (signupRows ?? []).forEach((r) => {
    if (!r.event_id) return;
    recentSignups.set(r.event_id, (recentSignups.get(r.event_id) ?? 0) + 1);
  });

  // 4. 누적 confirmed 신청수 (urgent 판정용 — capacity 대비)
  const { data: confirmedRows } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('registration_status', 'confirmed')
    .not('event_id', 'is', null);

  const confirmedTotal = new Map<string, number>();
  (confirmedRows ?? []).forEach((r) => {
    if (!r.event_id) return;
    confirmedTotal.set(r.event_id, (confirmedTotal.get(r.event_id) ?? 0) + 1);
  });

  // 5. 최근 1시간 조회수 (popular 판정용)
  const { data: viewRows } = await supabase
    .from('page_events')
    .select('event_id')
    .eq('action_type', 'view')
    .gt('created_at', hourAgo)
    .not('event_id', 'is', null);

  const recentViews = new Map<string, number>();
  (viewRows ?? []).forEach((r) => {
    if (!r.event_id) return;
    recentViews.set(r.event_id, (recentViews.get(r.event_id) ?? 0) + 1);
  });

  // 6. visible 이벤트 목록 (urgent 판정에 capacity/event_date 필요)
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, capacity, status')
    .eq('visible', true);

  // popular: 같은 페이지 내에서 가장 많이 조회된 1개 이벤트만 후보로 둠
  let popularEventId: string | null = null;
  let popularViews = 0;
  recentViews.forEach((v, id) => {
    if (v > popularViews) { popularViews = v; popularEventId = id; }
  });
  // 5회 미만이면 popular 노출 안 함 (의미 없음)
  if (popularViews < 5) popularEventId = null;

  // 7. 이벤트별 톤 계산 (우선순위 1개)
  const eventTones: { event_id: string; tone: Tone | null; count?: number }[] = [];

  (events ?? []).forEach((e) => {
    if (e.status !== 'open') {
      eventTones.push({ event_id: e.id, tone: null });
      return;
    }

    const viewers = eventViewers.get(e.id)?.size ?? 0;
    const recent = recentSignups.get(e.id) ?? 0;
    const confirmed = confirmedTotal.get(e.id) ?? 0;
    const dday = daysUntilKST(e.event_date);

    // 1) urgent
    if (
      e.capacity != null &&
      e.capacity > 0 &&
      confirmed / e.capacity >= th.urgent_capacity_pct &&
      dday >= 0 &&
      dday <= th.urgent_dday_within
    ) {
      eventTones.push({ event_id: e.id, tone: 'urgent' });
      return;
    }
    // 2) hot
    if (recent >= th.rising_recent_min * th.hot_multiplier) {
      eventTones.push({ event_id: e.id, tone: 'hot', count: recent });
      return;
    }
    // 3) rising
    if (recent >= th.rising_recent_min) {
      eventTones.push({ event_id: e.id, tone: 'rising', count: recent });
      return;
    }
    // 4) live
    if (viewers >= th.live_min) {
      eventTones.push({ event_id: e.id, tone: 'live', count: viewers });
      return;
    }
    // 5) popular (페이지 내 1개 한정)
    if (popularEventId === e.id) {
      eventTones.push({ event_id: e.id, tone: 'popular' });
      return;
    }

    eventTones.push({ event_id: e.id, tone: null });
  });

  return NextResponse.json({
    settings,
    page: { active_viewers: pageActiveViewers },
    events: eventTones,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
