// UTM 및 유입 정보 캡처 유틸 (클라이언트)
// - 랜딩 시점에 URL 쿼리의 utm_* 파라미터와 document.referrer를 sessionStorage에 저장
// - 등록 폼 제출 시점에 읽어서 API로 함께 전송
// - First-touch 어트리뷰션: 이미 저장된 값이 있으면 덮어쓰지 않음 (세션 단위)

export type UtmAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  referrer_url: string | null;
};

const STORAGE_KEY = 'cloocus_utm_attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return; // first-touch 유지

    const params = new URLSearchParams(window.location.search);
    const hasUtm = UTM_KEYS.some((k) => params.get(k));
    const referrer = document.referrer || '';
    const sameOrigin = referrer ? referrer.startsWith(window.location.origin) : true;

    if (!hasUtm && sameOrigin) return; // 내부 이동 + UTM 없음 → 저장할 가치 없음

    const attribution: UtmAttribution = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      landing_page: window.location.pathname + window.location.search,
      referrer_url: sameOrigin ? null : referrer,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage 접근 실패(프라이빗 모드 등) 시 조용히 무시
  }
}

export function readAttribution(): UtmAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UtmAttribution;
  } catch {
    return null;
  }
}
