'use client';

import { useState, useCallback, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES, PRIVACY_POLICY_TEXT } from '@/lib/constants';
import { trackFormSubmit, trackEventView, trackFormStart } from '@/lib/analytics';
import { captureAttribution, readAttribution } from '@/lib/utm';
import { trackView, trackClick, getUserId } from '@/lib/tracker';
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

type CustomQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'agreement';
type PublicCustomQuestion = {
  id: string;
  question_type: CustomQuestionType;
  label: string;
  description: string | null;
  options: { label: string }[];
  required: boolean;
};
type CustomAnswerValue = string | string[] | boolean;

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

export default function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [eventLoading, setEventLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [step, setStep] = useState<2 | 3>(2);

  const [formOptions, setFormOptions] = useState<Record<string, string[]>>({});
  const [privacyContent, setPrivacyContent] = useState('');
  const [privacyTitle, setPrivacyTitle] = useState('');

  const [customQuestions, setCustomQuestions] = useState<PublicCustomQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, CustomAnswerValue>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [emailWarning, setEmailWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const [validationPopup, setValidationPopup] = useState<string[]>([]);

  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const companyDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const companyRef = useRef<HTMLDivElement>(null);

  // 첫 진입 시 UTM/referrer 캡처 (slug 별 page_view 이벤트)
  useEffect(() => {
    captureAttribution();
    trackView(`/${slug}`);
  }, [slug]);

  // 이벤트 로드
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/by-slug/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setEvent(null);
          return;
        }
        const data: Event = await res.json();
        if (cancelled) return;
        setEvent(data);
        trackEventView(data.name, data.category);
        trackFormStart(data.name, data.category);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEventLoading(false);
      });

    fetch('/api/form-options')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setFormOptions(data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [slug]);

  // 이벤트별 개인정보 약관 + 추가 문항 로드
  useEffect(() => {
    if (!event) return;
    fetch(`/api/privacy-policy?category=${encodeURIComponent(event.privacy_category || '기타')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) setPrivacyContent(data.content);
        if (data.title) setPrivacyTitle(data.title);
      })
      .catch(() => {});

    fetch(`/api/events/${event.id}/questions`)
      .then((res) => res.json())
      .then((data) => {
        const list: PublicCustomQuestion[] = Array.isArray(data) ? data : [];
        setCustomQuestions(list);
        setCustomAnswers((prev) => {
          const next: Record<string, CustomAnswerValue> = {};
          for (const q of list) {
            if (q.id in prev) next[q.id] = prev[q.id];
            else if (q.question_type === 'multi_choice') next[q.id] = [];
            else if (q.question_type === 'agreement') next[q.id] = false;
            else next[q.id] = '';
          }
          return next;
        });
      })
      .catch(() => setCustomQuestions([]));
  }, [event]);

  const setCustomAnswer = (id: string, value: CustomAnswerValue) => {
    setCustomAnswers((prev) => ({ ...prev, [id]: value }));
    if (customErrors[id]) {
      setCustomErrors((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  };

  const validateCustomAnswers = (): string[] => {
    const errs: Record<string, string> = {};
    const popup: string[] = [];
    for (const q of customQuestions) {
      if (!q.required) continue;
      const v = customAnswers[q.id];
      const empty =
        (q.question_type === 'multi_choice' && Array.isArray(v) && v.length === 0) ||
        (q.question_type === 'agreement' && v !== true) ||
        ((q.question_type === 'short_text' || q.question_type === 'long_text' || q.question_type === 'single_choice') && (typeof v !== 'string' || !v.trim()));
      if (empty) {
        errs[q.id] = q.question_type === 'agreement' ? '동의가 필요합니다.' : '필수 항목입니다.';
        popup.push(`[추가 문항] ${q.label}`);
      }
    }
    setCustomErrors(errs);
    return popup;
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const companyCache = useRef<Map<string, string[]>>(new Map());
  const searchAbort = useRef<AbortController | null>(null);

  const searchCompanies = useCallback((q: string) => {
    clearTimeout(companyDebounce.current);
    if (searchAbort.current) searchAbort.current.abort();

    if (q.length < 1) {
      setCompanySuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
        setShowSuggestions(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setCompanySuggestions([]);
          setShowSuggestions(true);
        }
      }
    }, 100);
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'referral_source' && value !== '클루커스 담당자 소개' && value !== '외부 담당자 소개') {
        next.referrer_name = '';
      }
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
    const customPopup = validateCustomAnswers();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || customPopup.length > 0) {
      setValidationPopup([...Object.values(validationErrors), ...customPopup]);
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const attribution = readAttribution();
      const user_id = getUserId();
      trackClick('cta-register-submit', { event_id: event?.id || null });
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          event_id: event?.id,
          user_id,
          custom_answers: customAnswers,
          ...(attribution || {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ email: data.error });
        } else {
          setServerError(data.error || '등록 중 오류가 발생했습니다.');
        }
        return;
      }

      if (data.id) {
        trackFormSubmit(
          event?.name || '',
          event?.category || '',
          form.referral_source || undefined
        );
      }
      setStep(3);
    } catch {
      setServerError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 로딩 / 404 ====================
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
            <h1 className="text-xl font-bold mb-2">이벤트를 찾을 수 없습니다</h1>
            <p className="text-sm text-gray-500 mb-6">요청하신 URL의 이벤트가 존재하지 않거나 비공개 상태입니다.</p>
            <a href="/" className="btn-primary inline-block">이벤트 목록으로 이동</a>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // ==================== 완료 화면 ====================
  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col relative">
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
                  onClick={() => router.push('/')}
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

  // ==================== 등록 폼 ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline inline-block"
            >
              ← 이벤트 선택으로 돌아가기
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">클루커스 이벤트 등록하기</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 border border-gray-200 rounded-xl px-5 py-4" style={{ backgroundColor: '#e0f2fe' }}>
          <p className="text-base font-semibold text-gray-900">{event.name}</p>
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
        </div>

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

          {customQuestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 mt-6">
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <h2 className="text-lg font-semibold">{event.custom_questions_section_title?.trim() || '맞춤 혜택 안내를 위한 추가 정보'}</h2>
              </div>
              {customQuestions.map((q, idx) => {
                const err = customErrors[q.id];
                const num = idx + 1;
                const numberPrefix = <span className="text-gray-500 font-medium mr-1">{num}.</span>;
                if (q.question_type === 'short_text') {
                  return (
                    <div key={q.id} className="field">
                      <label>{numberPrefix}{q.label} {q.required && <span className="required">*</span>}</label>
                      {q.description && <p className="text-xs text-gray-500 mb-1.5">{q.description}</p>}
                      <input
                        type="text"
                        value={typeof customAnswers[q.id] === 'string' ? (customAnswers[q.id] as string) : ''}
                        onChange={(e) => setCustomAnswer(q.id, e.target.value)}
                        className={err ? 'error' : ''}
                      />
                      {err && <span className="error-msg">{err}</span>}
                    </div>
                  );
                }
                if (q.question_type === 'long_text') {
                  return (
                    <div key={q.id} className="field">
                      <label>{numberPrefix}{q.label} {q.required && <span className="required">*</span>}</label>
                      {q.description && <p className="text-xs text-gray-500 mb-1.5">{q.description}</p>}
                      <textarea
                        rows={3}
                        value={typeof customAnswers[q.id] === 'string' ? (customAnswers[q.id] as string) : ''}
                        onChange={(e) => setCustomAnswer(q.id, e.target.value)}
                        className={err ? 'error' : ''}
                      />
                      {err && <span className="error-msg">{err}</span>}
                    </div>
                  );
                }
                if (q.question_type === 'single_choice') {
                  return (
                    <div key={q.id} className="field">
                      <label>{numberPrefix}{q.label} {q.required && <span className="required">*</span>}</label>
                      {q.description && <p className="text-xs text-gray-500 mb-1.5">{q.description}</p>}
                      <div className="space-y-1.5">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`custom-${q.id}`}
                              value={opt.label}
                              checked={customAnswers[q.id] === opt.label}
                              onChange={() => setCustomAnswer(q.id, opt.label)}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {err && <span className="error-msg">{err}</span>}
                    </div>
                  );
                }
                if (q.question_type === 'multi_choice') {
                  const arr = Array.isArray(customAnswers[q.id]) ? (customAnswers[q.id] as string[]) : [];
                  return (
                    <div key={q.id} className="field">
                      <label>{numberPrefix}{q.label} {q.required && <span className="required">*</span>}</label>
                      {q.description && <p className="text-xs text-gray-500 mb-1.5">{q.description}</p>}
                      <div className="space-y-1.5">
                        {q.options.map((opt, i) => {
                          const checked = arr.includes(opt.label);
                          return (
                            <label key={i} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...arr, opt.label]
                                    : arr.filter((v) => v !== opt.label);
                                  setCustomAnswer(q.id, next);
                                }}
                                className="w-4 h-4 rounded accent-blue-600"
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {err && <span className="error-msg">{err}</span>}
                    </div>
                  );
                }
                if (q.question_type === 'agreement') {
                  const checked = customAnswers[q.id] === true;
                  return (
                    <div key={q.id} className="field">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setCustomAnswer(q.id, e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                        />
                        <span className="text-sm">
                          <span className="text-gray-500 font-medium mr-1">{num}.</span>{q.label} {q.required && <span className="text-red-500">*</span>}
                        </span>
                      </label>
                      {err && <span className="error-msg mt-1 block">{err}</span>}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

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

          <div className="mt-8 mb-12">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? '등록 중...' : '이벤트 등록하기'}
            </button>
          </div>
        </form>

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
