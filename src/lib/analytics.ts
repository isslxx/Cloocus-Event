// GA4 커스텀 이벤트 유틸
// 관리자 페이지에서는 GoogleAnalytics 컴포넌트가 로드되지 않으므로 gtag 함수가 없음
// → typeof 체크로 안전하게 호출

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
    __INTERNAL_TRAFFIC__?: boolean;
  }
}

export function trackEvent(eventName: string, params?: GtagParams) {
  if (typeof window === 'undefined') return;
  // 내부 IP는 GA 이벤트 전송 제외
  if (window.__INTERNAL_TRAFFIC__ === true) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params || {});
}

// === 주요 전환 이벤트 ===

// 이벤트 카드 클릭 (어떤 이벤트에 관심 있는지)
export const trackEventView = (eventName: string, eventCategory: string) => {
  trackEvent('event_view', {
    event_name_label: eventName,
    event_category: eventCategory,
  });
};

// 등록 폼 시작
export const trackFormStart = (eventName: string, eventCategory: string) => {
  trackEvent('form_start', {
    event_name_label: eventName,
    event_category: eventCategory,
  });
};

// 등록 완료 (핵심 전환)
export const trackFormSubmit = (eventName: string, eventCategory: string, referralSource?: string) => {
  trackEvent('form_submit', {
    event_name_label: eventName,
    event_category: eventCategory,
    referral_source: referralSource,
  });
};

// 설문조사 완료
export const trackSurveyComplete = (eventName: string, eventCategory: string) => {
  trackEvent('survey_complete', {
    event_name_label: eventName,
    event_category: eventCategory,
  });
};

// 수료증 다운로드 (최종 여정 완료)
export const trackCertificateDownload = (eventName: string, eventCategory: string) => {
  trackEvent('certificate_download', {
    event_name_label: eventName,
    event_category: eventCategory,
  });
};

// 신청자 포털 로그인
export const trackPortalLogin = () => {
  trackEvent('portal_login');
};

// 추가 문의 등록
export const trackInquirySubmit = (eventName: string) => {
  trackEvent('inquiry_submit', {
    event_name_label: eventName,
  });
};

// 신청자 본인 등록 취소 (성공 시)
export const trackRegistrationCancel = (eventName: string, eventCategory: string) => {
  trackEvent('registration_cancel', {
    event_name_label: eventName,
    event_category: eventCategory,
  });
};
