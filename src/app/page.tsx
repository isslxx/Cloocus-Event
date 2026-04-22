'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES, PRIVACY_POLICY_TEXT } from '@/lib/constants';
import { trackFormSubmit, trackEventView, trackFormStart } from '@/lib/analytics';
import { captureAttribution, readAttribution } from '@/lib/utm';
import type { } from '@/lib/constants'; // keep import for PRIVACY_POLICY_TEXT
import { formatPhone, isBlockedEmailDomain, validateRegistrationForm } from '@/lib/validation';
import type { FormErrors } from '@/lib/validation';
import type { Event } from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  company_name: '',
  department: '',
  job_title: '',
  email: '',
  phone: '',
  industry: '',
  industry_etc: '',
  company_size: '',
  referral_source: '',
  referral_source_etc: '',
  referrer_name: '',
  inquiry: '',
  privacy_consent: false,
  pin: '',
};

function BrandFooter() {
  return (
    <footer className="py-4 sm:py-5 px-4 border-t border-gray-200" style={{ backgroundColor: '#eef0f4' }}>
      <div className="max-w-lg mx-auto text-center">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cloocus-logo.png" alt="Cloocus" className="h-4 sm:h-5" />
          <span className="text-gray-300">|</span>
          <span className="text-xs sm:text-sm text-gray-600 font-medium">(주)클루커스</span>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
          📍본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75)<br className="sm:hidden" /><span className="hidden sm:inline"> | </span>📞02-597-3400
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
          ✉️ marketing@cloocus.com
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: 이벤트 선택
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  // 동적 폼 옵션
  const [formOptions, setFormOptions] = useState<Record<string, string[]>>({});
  const [privacyContent, setPrivacyContent] = useState('');
  const [privacyTitle, setPrivacyTitle] = useState('');

  // Step 2: 폼
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [emailWarning, setEmailWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // 등록 완료 후 수정 지원
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [eventEditable, setEventEditable] = useState(false);

  // 신청 내역 조회
  const [showLookup, setShowLookup] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupPin, setLookupPin] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // 검증 오류 팝업
  const [validationPopup, setValidationPopup] = useState<string[]>([]);

  // 마감 이벤트 팝업
  const [closedEventPopup, setClosedEventPopup] = useState<Event | null>(null);
  const [closedAcknowledged, setClosedAcknowledged] = useState(false);

  // 회사명 자동완성
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const companyDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const companyRef = useRef<HTMLDivElement>(null);

  // UTM / referrer 캡처 (first-touch, 랜딩 시점 1회)
  useEffect(() => {
    captureAttribution();
  }, []);

  // 이벤트 목록 + 폼 옵션 로드
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {})
      .finally(() => setEventsLoading(false));

    fetch('/api/form-options')
      .then((res) => res.json())
      .then((data) => setFormOptions(data))
      .catch(() => {});
  }, []);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [companySource, setCompanySource] = useState<'internal' | 'external' | 'none'>('none');
  const companyCache = useRef<Map<string, string[]>>(new Map());

  const searchAbort = useRef<AbortController | null>(null);

  const searchCompanies = useCallback((q: string) => {
    clearTimeout(companyDebounce.current);
    // 이전 요청 즉시 취소
    if (searchAbort.current) searchAbort.current.abort();

    if (q.length < 1) {
      setCompanySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 캐시 확인 → 즉시 반환
    const cached = companyCache.current.get(q);
    if (cached) {
      setCompanySuggestions(cached);
      setShowSuggestions(true);
      return;
    }

    companyDebounce.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbort.current = controller;
      try {
        const res = await fetch(`/api/admin/companies?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        const results = data.results || data || [];
        const list = Array.isArray(results) ? results : [];
        companyCache.current.set(q, list);
        setCompanySuggestions(list);
        setCompanySource(data.source || 'none');
        setShowSuggestions(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setCompanySuggestions([]);
          setCompanySource('none');
          setShowSuggestions(true);
        }
      }
    }, 100);
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // 신청 경로 변경 시 추천인 초기화
      if (field === 'referral_source' && value !== '클루커스 담당자 소개' && value !== '외부 담당자 소개') {
        next.referrer_name = '';
      }
      // 기타가 아닌 값 선택 시 기타 입력값 초기화
      if (field === 'industry' && value !== '기타') next.industry_etc = '';
      if (field === 'referral_source' && value !== '기타') next.referral_source_etc = '';
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setServerError('');
  };

  const checkEmailWarning = (email: string) => {
    if (email && isBlockedEmailDomain(email)) {
      setEmailWarning('Naver, Gmail, Kakao, Daum 등 개인 이메일 사용 시 관련 안내 이메일이 반송·미수신 될 수 있습니다. 가능하면 업무용 이메일을 사용해주세요.');
    } else {
      setEmailWarning('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setValidationPopup(Object.values(validationErrors));
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      let res: Response;
      if (editMode && registrationId) {
        // 수정 모드
        res = await fetch(`/api/register/${registrationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        // 신규 등록 — 첫 터치 시 캡처된 UTM/referrer 동봉
        const attribution = readAttribution();
        res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            event_id: selectedEvent?.id,
            ...(attribution || {}),
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ email: data.error });
        } else {
          setServerError(data.error || '등록 중 오류가 발생했습니다.');
        }
        return;
      }

      if (!editMode && data.id) {
        setRegistrationId(data.id);
        // GA: 등록 완료 이벤트
        trackFormSubmit(
          selectedEvent?.name || '',
          selectedEvent?.category || '',
          form.referral_source || undefined
        );
      }
      setEditMode(false);
      setStep(3);
    } catch {
      setServerError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== STEP 1: 이벤트 선택 ====================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트</h1>
            <p className="text-gray-500 text-center mb-8">참여하실 이벤트를 선택해주세요.</p>

            {eventsLoading ? (
              <p className="text-center text-gray-400 py-8">로딩 중...</p>
            ) : events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">현재 등록 가능한 이벤트가 없습니다.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {events.map((event) => {
                    const isEnded = event.status === 'ended';
                    const isClosed = event.status === 'closed';
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          if (isEnded) return;
                          if (isClosed) {
                            setClosedEventPopup(event);
                            return;
                          }
                          setSelectedEvent(event);
                          trackEventView(event.name, event.category);
                        }}
                        disabled={isEnded}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isEnded
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : selectedEvent?.id === event.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {event.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 shrink-0">
                                {event.category}
                              </span>
                            )}
                            <p className={`font-semibold text-base ${isEnded ? 'text-gray-400' : ''}`}>{event.name}</p>
                          </div>
                          {isEnded && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-600 shrink-0">종료</span>
                          )}
                          {isClosed && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-600 shrink-0">마감</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {event.category === '프로모션' ? (
                            <span className="text-sm text-gray-500">
                              기한: {(() => { const d = new Date(event.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {(() => { const d = new Date(event.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                            </span>
                          )}
                          {event.event_type && event.event_type !== 'none' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              event.event_type === 'online'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {event.event_type === 'online' ? 'Online' : 'Offline'}
                            </span>
                          )}
                          {event.capacity && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              정원 {event.capacity}명
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {events.every((e) => e.status === 'closed' || e.status === 'ended') && (
                  <p className="text-center text-gray-400 text-sm mt-4">현재 모든 이벤트의 신청이 마감되었습니다.</p>
                )}
              </>
            )}

            {closedEventPopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-500 text-xl">⚠</span>
                    <h3 className="text-lg font-bold text-gray-900">마감 안내</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">현재 정원이 마감되어 등록이 어려울 수 있습니다.</p>
                  <label className="flex items-start gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={closedAcknowledged}
                      onChange={(e) => setClosedAcknowledged(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">위 내용을 확인했습니다.</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      disabled={!closedAcknowledged}
                      onClick={() => {
                        setSelectedEvent(closedEventPopup);
                        setClosedEventPopup(null);
                        setClosedAcknowledged(false);
                      }}
                      className="btn-primary flex-1 disabled:opacity-40"
                    >
                      등록 진행하기
                    </button>
                    <button
                      onClick={() => { setClosedEventPopup(null); setClosedAcknowledged(false); }}
                      className="btn-secondary flex-1"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={async () => {
                if (!selectedEvent || selectedEvent.status === 'ended') return;
                try {
                  const res = await fetch(`/api/privacy-policy?category=${encodeURIComponent(selectedEvent.privacy_category || '기타')}`);
                  const data = await res.json();
                  if (data.content) setPrivacyContent(data.content);
                  if (data.title) setPrivacyTitle(data.title);
                } catch { /* ignore */ }
                if (selectedEvent) {
                  trackFormStart(selectedEvent.name, selectedEvent.category);
                }
                setStep(2);
              }}
              disabled={!selectedEvent || selectedEvent.status === 'ended'}
              className="btn-primary w-full mt-6"
            >
              등록하기
            </button>
            <a
              href="/my"
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 hover:underline block text-center"
            >
              등록 정보 조회
            </a>
          </div>

          {/* 신청 내역 조회 모달 */}
          {showLookup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">신청 내역 조회</h3>
                <p className="text-sm text-gray-500 mb-5">등록 시 입력한 이메일과 확인 암호를 입력해주세요.</p>

                <div className="space-y-4">
                  <div className="field">
                    <label className="text-sm font-medium text-gray-700">이메일 주소</label>
                    <input
                      type="email"
                      value={lookupEmail}
                      onChange={(e) => { setLookupEmail(e.target.value); setLookupError(''); }}
                      placeholder="name@company.com"
                      className="w-full"
                    />
                  </div>
                  <div className="field">
                    <label className="text-sm font-medium text-gray-700">확인 암호 (숫자 4자리)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={lookupPin}
                      onChange={(e) => { setLookupPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setLookupError(''); }}
                      placeholder="0000"
                      maxLength={4}
                      className="w-full"
                    />
                  </div>
                </div>

                {lookupError && (
                  <p className="text-sm text-red-500 mt-3">{lookupError}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowLookup(false); setLookupEmail(''); setLookupPin(''); setLookupError(''); }}
                    className="btn-secondary flex-1"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    disabled={lookupLoading}
                    onClick={async () => {
                      if (!lookupEmail.trim()) { setLookupError('이메일을 입력해주세요.'); return; }
                      if (!/^\d{4}$/.test(lookupPin)) { setLookupError('확인 암호 4자리 숫자를 입력해주세요.'); return; }
                      setLookupLoading(true);
                      setLookupError('');
                      try {
                        const res = await fetch('/api/register/lookup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: lookupEmail, pin: lookupPin }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setLookupError(data.error || '조회에 실패했습니다.');
                          return;
                        }
                        const r = data.registration;
                        // 기타 값 분리
                        let industry = r.industry;
                        let industry_etc = '';
                        if (industry?.startsWith('기타: ')) {
                          industry_etc = industry.replace('기타: ', '');
                          industry = '기타';
                        }
                        let referral_source = r.referral_source;
                        let referral_source_etc = '';
                        if (referral_source?.startsWith('기타: ')) {
                          referral_source_etc = referral_source.replace('기타: ', '');
                          referral_source = '기타';
                        }
                        // 이벤트 정보 로드
                        if (r.event_id) {
                          const evt = events.find((e) => e.id === r.event_id);
                          if (evt) setSelectedEvent(evt);
                          try {
                            const pRes = await fetch(`/api/privacy-policy?category=${encodeURIComponent(evt?.privacy_category || '기타')}`);
                            const pData = await pRes.json();
                            if (pData.content) setPrivacyContent(pData.content);
                            if (pData.title) setPrivacyTitle(pData.title);
                          } catch { /* ignore */ }
                        }
                        setForm({
                          name: r.name || '',
                          company_name: r.company_name || '',
                          department: r.department || '',
                          job_title: r.job_title || '',
                          email: r.email || '',
                          phone: r.phone || '',
                          industry,
                          industry_etc,
                          company_size: r.company_size || '',
                          referral_source,
                          referral_source_etc,
                          referrer_name: r.referrer_name || '',
                          inquiry: r.inquiry || '',
                          privacy_consent: true,
                          pin: lookupPin,
                        });
                        setRegistrationId(r.id);
                        setEventEditable(data.editable);
                        setEditMode(true);
                        setErrors({});
                        setServerError('');
                        setShowLookup(false);
                        setLookupEmail('');
                        setLookupPin('');
                        setStep(2);
                      } catch {
                        setLookupError('네트워크 오류가 발생했습니다.');
                      } finally {
                        setLookupLoading(false);
                      }
                    }}
                    className="btn-primary flex-1"
                  >
                    {lookupLoading ? '조회 중...' : '조회하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // ==================== STEP 3: 완료 ====================
  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col relative">
        {/* 폭죽 Canvas - 전체 화면, 콘텐츠 뒤 */}
        <canvas
          ref={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const colors = ['#2563eb', '#4f46e5', '#06b6d4', '#8b5cf6', '#f59e0b', '#0ea5e9', '#10b981', '#ec4899'];
            const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; rotation: number; rotSpeed: number; shape: number }[] = [];

            const cx = canvas.width / 2;
            const cy = canvas.height * 0.4;

            for (let i = 0; i < 60; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 4 + Math.random() * 10;
              particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0,
                maxLife: 60 + Math.random() * 40,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
                shape: Math.floor(Math.random() * 3),
              });
            }

            let frame = 0;
            const animate = () => {
              if (frame > 120) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              for (const p of particles) {
                p.life++;
                if (p.life > p.maxLife) continue;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.vx *= 0.98;
                p.rotation += p.rotSpeed;

                const alpha = Math.max(0, 1 - p.life / p.maxLife);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;

                if (p.shape === 0) {
                  ctx.beginPath();
                  ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                  ctx.fill();
                } else if (p.shape === 1) {
                  ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                } else {
                  ctx.beginPath();
                  ctx.moveTo(0, -p.size / 2);
                  ctx.lineTo(p.size / 2, p.size / 2);
                  ctx.lineTo(-p.size / 2, p.size / 2);
                  ctx.closePath();
                  ctx.fill();
                }
                ctx.restore();
              }

              frame++;
              requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
        />

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="neon-wrapper" style={{ overflow: 'visible' }}>
            <div className="confirm-container text-center">
              <div className="check-icon-bounce bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8" style={{ width: 72, height: 72 }}>
                <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-relaxed">
                클루커스 이벤트에 관심을 가지고
              </h2>
              <h2 className="text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
                신청해 주셔서 감사합니다!
              </h2>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                등록하신 이메일로 등록 확정 여부와<br />관련 정보를 D-7 이내 전달해 드리겠습니다.
              </p>
              <p className="mt-4 text-sm font-medium px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 inline-block">
                *등록 정보 조회에서 등록 여부를 직접 확인하실 수 있습니다.
              </p>

              <div className="flex flex-col gap-3 mt-10" style={{ position: 'relative', zIndex: 60 }}>
                <a href="/my" className="btn-primary text-center">
                  등록 정보 조회 바로가기
                </a>
                <button
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setSelectedEvent(null);
                    setRegistrationId(null);
                    setEditMode(false);
                    setErrors({});
                    setStep(1);
                  }}
                  className="btn-secondary"
                >
                  새로운 등록
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 60 }}>
          <BrandFooter />
        </div>
      </div>
    );
  }

  // ==================== STEP 2: 등록 폼 ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => editMode ? setStep(3) : setStep(1)}
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline inline-block"
            >
              {editMode ? '← 돌아가기' : '← 이벤트 선택으로 돌아가기'}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editMode ? '등록 정보 조회' : '클루커스 이벤트 등록하기'}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 신청 행사 정보 */}
        {selectedEvent && (
          <div className="mb-6 border border-gray-200 rounded-xl px-5 py-4" style={{ backgroundColor: '#e0f2fe' }}>
            <p className="text-base font-semibold text-gray-900">{selectedEvent.name}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {selectedEvent.category === '프로모션' ? (
                <span className="text-sm text-gray-500">
                  기한: {(() => { const d = new Date(selectedEvent.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                </span>
              ) : (
                <span className="text-sm text-gray-500">
                  {(() => { const d = new Date(selectedEvent.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                </span>
              )}
              {selectedEvent.event_type && selectedEvent.event_type !== 'none' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  selectedEvent.event_type === 'online'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedEvent.event_type === 'online' ? 'Online' : 'Offline'}
                </span>
              )}
              {selectedEvent.capacity && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                  정원 {selectedEvent.capacity}명
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <h2 className="text-lg font-semibold">기본 정보</h2>
              <span className="text-xs text-red-500">* 필수</span>
            </div>

            <div className="field">
              <label>성함 <span className="required">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="홍길동"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>

            <div className="field" ref={companyRef}>
              <label>회사명 <span className="required">*</span></label>
              <div className="relative">
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => {
                    handleChange('company_name', e.target.value);
                    searchCompanies(e.target.value);
                  }}
                  onFocus={() => companySuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="회사명을 검색해주세요"
                  className={`w-full ${errors.company_name ? 'error' : ''}`}
                  autoComplete="off"
                  style={{ paddingLeft: 34, boxSizing: 'border-box' }}
                />
                {showSuggestions && form.company_name.length >= 1 && (
                  <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-56 overflow-y-auto">
                    {companySuggestions.length > 0 ? (
                      <>
                        {companySuggestions.map((name) => (
                          <li
                            key={name}
                            className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2"
                            onMouseDown={() => {
                              handleChange('company_name', name);
                              setShowSuggestions(false);
                            }}
                          >
                            <span className="text-gray-400 text-xs">🏢</span>
                            {name}
                          </li>
                        ))}
                        <li
                          className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-500 border-t border-gray-100"
                          onMouseDown={() => setShowSuggestions(false)}
                        >
                          <span className="text-xs">✏️</span> &quot;{form.company_name}&quot; 직접 입력
                        </li>
                      </>
                    ) : (
                      <li
                        className="px-3 py-3 text-sm text-gray-500"
                        onMouseDown={() => setShowSuggestions(false)}
                      >
                        <p className="text-gray-400 text-xs mb-1">검색 결과가 없습니다</p>
                        <p className="text-blue-600 cursor-pointer hover:underline">
                          <span className="text-xs">✏️</span> &quot;{form.company_name}&quot; 직접 입력하기
                        </p>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {errors.company_name && <span className="error-msg">{errors.company_name}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="field">
                <label>부서명 <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="소속 부서"
                  className={errors.department ? 'error' : ''}
                />
                {errors.department && <span className="error-msg">{errors.department}</span>}
              </div>
              <div className="field">
                <label>직급 <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => handleChange('job_title', e.target.value)}
                  placeholder="직급/직책"
                  className={errors.job_title ? 'error' : ''}
                />
                {errors.job_title && <span className="error-msg">{errors.job_title}</span>}
              </div>
            </div>

            <div className="field">
              <label>업무용 이메일 주소 <span className="required">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { handleChange('email', e.target.value); checkEmailWarning(e.target.value); }}
                onBlur={() => checkEmailWarning(form.email)}
                placeholder="name@company.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
              {emailWarning && !errors.email && <span className="warning-msg">{emailWarning}</span>}
            </div>

            <div className="field">
              <label>핸드폰 연락처 <span className="required">*</span></label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-msg">{errors.phone}</span>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 mt-6">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <h2 className="text-lg font-semibold">추가 정보</h2>
              <span className="text-xs text-red-500">* 필수</span>
            </div>

            <div className="field">
              <label>산업군 <span className="required">*</span></label>
              <select
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className={errors.industry ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                {(formOptions.industry || INDUSTRIES).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.industry && <span className="error-msg">{errors.industry}</span>}
              {form.industry === '기타' && (
                <>
                  <input
                    type="text"
                    value={form.industry_etc}
                    onChange={(e) => handleChange('industry_etc', e.target.value)}
                    placeholder="산업군을 입력해주세요 *"
                    className={`mt-2 ${errors.industry_etc ? 'error' : ''}`}
                    style={{ padding: '10px 12px', border: `1px solid ${errors.industry_etc ? '#ef4444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, width: '100%' }}
                  />
                  {errors.industry_etc && <span className="error-msg">{errors.industry_etc}</span>}
                </>
              )}
            </div>

            <div className="field">
              <label>기업 규모 <span className="required">*</span></label>
              <select
                value={form.company_size}
                onChange={(e) => handleChange('company_size', e.target.value)}
                className={errors.company_size ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                {(formOptions.company_size || COMPANY_SIZES).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.company_size && <span className="error-msg">{errors.company_size}</span>}
            </div>

            <div className="field">
              <label>신청 경로 <span className="required">*</span></label>
              <select
                value={form.referral_source}
                onChange={(e) => handleChange('referral_source', e.target.value)}
                className={errors.referral_source ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                {(formOptions.referral_source || REFERRAL_SOURCES).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.referral_source && <span className="error-msg">{errors.referral_source}</span>}
              {form.referral_source === '기타' && (
                <>
                  <input
                    type="text"
                    value={form.referral_source_etc}
                    onChange={(e) => handleChange('referral_source_etc', e.target.value)}
                    placeholder="신청 경로를 입력해주세요 *"
                    className={`mt-2 ${errors.referral_source_etc ? 'error' : ''}`}
                    style={{ padding: '10px 12px', border: `1px solid ${errors.referral_source_etc ? '#ef4444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, width: '100%' }}
                  />
                  {errors.referral_source_etc && <span className="error-msg">{errors.referral_source_etc}</span>}
                </>
              )}
            </div>

            {(form.referral_source === '클루커스 담당자 소개' || form.referral_source === '외부 담당자 소개') && (
              <div className="field">
                <label>추천인 성명 <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.referrer_name}
                  onChange={(e) => handleChange('referrer_name', e.target.value)}
                  placeholder="추천인 성명을 입력해주세요"
                  className={errors.referrer_name ? 'error' : ''}
                />
                {errors.referrer_name && <span className="error-msg">{errors.referrer_name}</span>}
              </div>
            )}

            <div className="field">
              <label>문의사항</label>
              <textarea
                rows={3}
                value={form.inquiry}
                onChange={(e) => handleChange('inquiry', e.target.value)}
                placeholder="문의사항이 있다면 입력해주세요 (선택)"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">{privacyTitle || '개인정보 수집 및 이용 동의'}</h2>
            <details className="mb-4">
              <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                약관 전문 보기
              </summary>
              <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {privacyContent || formOptions.privacy_policy?.[0] || PRIVACY_POLICY_TEXT}
              </pre>
            </details>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacy_consent}
                onChange={(e) => handleChange('privacy_consent', e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-blue-600"
              />
              <span className="text-sm">
                동의합니다 <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.privacy_consent && (
              <span className="error-msg mt-2 block">{errors.privacy_consent}</span>
            )}
          </div>

          {!editMode && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4">개인 확인 암호</h2>
              <p className="text-sm text-gray-500 mb-3">
                신청 내역을 추후 확인·수정할 때 사용할 숫자 4자리를 입력해주세요.
              </p>
              <div className="field">
                <label>확인 암호 <span className="required">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.pin}
                  onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="숫자 4자리"
                  maxLength={4}
                  className={errors.pin ? 'error' : ''}
                  style={{ maxWidth: 160, letterSpacing: '0.3em', textAlign: 'center', fontSize: 18 }}
                />
                {errors.pin && <span className="error-msg">{errors.pin}</span>}
              </div>
            </div>
          )}

          <div className="mt-8 mb-12">
            {editMode && !eventEditable ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">이벤트가 마감되어 수정할 수 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary w-full"
                >
                  돌아가기
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? (editMode ? '수정 중...' : '등록 중...') : (editMode ? '수정하기' : '이벤트 등록하기')}
              </button>
            )}
          </div>
        </form>

        {/* 검증 오류 팝업 */}
        {validationPopup.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-500 text-xl">⚠</span>
                <h3 className="text-lg font-bold text-gray-900">입력 정보를 확인해주세요</h3>
              </div>
              <ul className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {validationPopup.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span>
                    {msg}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setValidationPopup([])}
                className="btn-primary w-full"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
