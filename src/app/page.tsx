'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES, PRIVACY_POLICY_TEXT } from '@/lib/constants';
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
  company_size: '',
  referral_source: '',
  referrer_name: '',
  inquiry: '',
  privacy_consent: false,
};

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: 이벤트 선택
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Step 2: 폼
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [emailWarning, setEmailWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // 회사명 자동완성
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const companyDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const companyRef = useRef<HTMLDivElement>(null);

  // 이벤트 목록 로드
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
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

  const searchCompanies = useCallback((q: string) => {
    clearTimeout(companyDebounce.current);
    if (q.length < 2) {
      setCompanySuggestions([]);
      return;
    }
    companyDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/companies?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setCompanySuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setCompanySuggestions([]);
      }
    }, 300);
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // 신청 경로 변경 시 추천인 초기화
      if (field === 'referral_source' && value !== '클루커스 담당자 소개' && value !== '외부 담당자 소개') {
        next.referrer_name = '';
      }
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

  const handleEmailBlur = () => {
    if (form.email && isBlockedEmailDomain(form.email)) {
      setEmailWarning('Naver, Gmail, Kakao, Daum 등 개인 이메일 사용은 관련 안내 이메일이 반송·미수신 될 수 있습니다.');
    } else {
      setEmailWarning('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, event_id: selectedEvent?.id }),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트 등록하기</h1>
            <p className="text-gray-500 text-center mb-8">참여하실 이벤트를 선택해주세요.</p>

            {eventsLoading ? (
              <p className="text-center text-gray-400 py-8">로딩 중...</p>
            ) : events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">현재 등록 가능한 이벤트가 없습니다.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {events.map((event) => {
                    const isClosed = event.status === 'closed';
                    return (
                      <button
                        key={event.id}
                        onClick={() => !isClosed && setSelectedEvent(event)}
                        disabled={isClosed}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isClosed
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : selectedEvent?.id === event.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold text-base ${isClosed ? 'text-gray-400' : ''}`}>{event.name}</p>
                          {isClosed && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-600 shrink-0">
                              마감
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-sm text-gray-500">
                            {new Date(event.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            event.event_type === 'online'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {event.event_type === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {events.every((e) => e.status === 'closed') && (
                  <p className="text-center text-gray-400 text-sm mt-4">현재 모든 이벤트의 신청이 마감되었습니다.</p>
                )}
              </>
            )}

            <button
              onClick={() => selectedEvent && selectedEvent.status === 'open' && setStep(2)}
              disabled={!selectedEvent || selectedEvent.status === 'closed'}
              className="btn-primary w-full mt-6"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STEP 3: 완료 ====================
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti */}
        <div className="confetti-container" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 1.2}s`,
              animationDuration: `${1.5 + Math.random() * 1.5}s`,
              backgroundColor: ['#2563eb', '#4f46e5', '#06b6d4', '#8b5cf6', '#3b82f6', '#0ea5e9'][i % 6],
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
              borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
              transform: `rotate(${Math.random() * 360}deg)`,
            }} />
          ))}
        </div>

        <div className="neon-wrapper">
          <div className="confirm-container text-center">
            {/* 체크 아이콘 (bounce-in) */}
            <div className="check-icon-bounce w-18 h-18 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8" style={{ width: 72, height: 72 }}>
              <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-2 leading-relaxed">
              클루커스 이벤트에 관심을 가지고
            </h2>
            <h2 className="text-2xl font-bold mb-6 leading-relaxed">
              신청해 주셔서 감사합니다!
            </h2>
            <p className="text-base text-gray-500 leading-relaxed">
              등록하신 이메일로 등록 확정 여부와<br />관련 정보를 D-7 이내 전달해 드리겠습니다.
            </p>

            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setSelectedEvent(null);
                setErrors({});
                setStep(1);
              }}
              className="btn-secondary mt-10"
            >
              새로운 등록
            </button>
          </div>
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
              onClick={() => setStep(1)}
              className="text-sm text-blue-600 hover:underline inline-block"
            >
              ← 이벤트 선택으로 돌아가기
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">클루커스 이벤트 등록하기</h1>
          {selectedEvent && (
            <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              <span>{selectedEvent.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedEvent.event_type === 'online'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {selectedEvent.event_type === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold border-b pb-3 mb-2">기본 정보</h2>

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
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => {
                    handleChange('company_name', e.target.value);
                    searchCompanies(e.target.value);
                  }}
                  onFocus={() => companySuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="회사명을 입력해주세요"
                  className={errors.company_name ? 'error' : ''}
                  autoComplete="off"
                />
                {showSuggestions && companySuggestions.length > 0 && (
                  <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                    {companySuggestions.map((name) => (
                      <li
                        key={name}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onMouseDown={() => {
                          handleChange('company_name', name);
                          setShowSuggestions(false);
                        }}
                      >
                        {name}
                      </li>
                    ))}
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
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={handleEmailBlur}
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
            <h2 className="text-lg font-semibold border-b pb-3 mb-2">추가 정보</h2>

            <div className="field">
              <label>산업군 <span className="required">*</span></label>
              <select
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className={errors.industry ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.industry && <span className="error-msg">{errors.industry}</span>}
            </div>

            <div className="field">
              <label>기업 규모 <span className="required">*</span></label>
              <select
                value={form.company_size}
                onChange={(e) => handleChange('company_size', e.target.value)}
                className={errors.company_size ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                {COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
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
                {REFERRAL_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.referral_source && <span className="error-msg">{errors.referral_source}</span>}
            </div>

            {(form.referral_source === '클루커스 담당자 소개' || form.referral_source === '외부 담당자 소개') && (
              <div className="field">
                <label>추천인 성명</label>
                <input
                  type="text"
                  value={form.referrer_name}
                  onChange={(e) => handleChange('referrer_name', e.target.value)}
                  placeholder="추천인 성명을 입력해주세요"
                />
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
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">개인정보 수집 및 이용 동의</h2>
            <details className="mb-4">
              <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                약관 전문 보기
              </summary>
              <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {PRIVACY_POLICY_TEXT}
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
      </main>
    </div>
  );
}
