// 클라이언트 행동 트래커
// - session_id: sessionStorage (브라우저 탭 수명)
// - user_id:    localStorage (익명, 영구)
// - view/click 이벤트를 /api/track 으로 POST (sendBeacon 우선)
// - UTM/landing/referrer 자동 동봉

import { readAttribution } from '@/lib/utm';

const SESSION_KEY = 'cloocus_session_id';
const USER_KEY = 'cloocus_user_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = randomId();
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return randomId();
  }
}

export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let uid = window.localStorage.getItem(USER_KEY);
    if (!uid) {
      uid = randomId();
      window.localStorage.setItem(USER_KEY, uid);
    }
    return uid;
  } catch {
    return '';
  }
}

type TrackPayload = {
  page: string;
  action_type: 'view' | 'click';
  element_id?: string;
  event_id?: string | null;
};

function post(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify(payload);
    // 페이지 전환·탭 닫기에도 유실 없이 전송
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/track', blob);
      if (ok) return;
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 조용히 무시
  }
}

function enrich(t: TrackPayload): Record<string, unknown> {
  if (typeof window === 'undefined') return { ...t };
  const attr = readAttribution();
  return {
    session_id: getSessionId(),
    user_id: getUserId(),
    page: t.page,
    action_type: t.action_type,
    element_id: t.element_id || null,
    event_id: t.event_id || null,
    utm_source: attr?.utm_source || null,
    utm_medium: attr?.utm_medium || null,
    utm_campaign: attr?.utm_campaign || null,
    utm_content: attr?.utm_content || null,
    utm_term: attr?.utm_term || null,
    landing_page: attr?.landing_page || null,
    referrer_url: attr?.referrer_url || (typeof document !== 'undefined' && document.referrer ? document.referrer : null),
  };
}

export function trackView(page?: string): void {
  if (typeof window === 'undefined') return;
  const p = page || window.location.pathname;
  post(enrich({ page: p, action_type: 'view' }));
}

export function trackClick(elementId: string, opts?: { page?: string; event_id?: string | null }): void {
  if (typeof window === 'undefined') return;
  const p = opts?.page || window.location.pathname;
  post(enrich({ page: p, action_type: 'click', element_id: elementId, event_id: opts?.event_id || null }));
}
