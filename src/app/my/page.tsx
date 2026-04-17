'use client';

import { useState, useEffect } from 'react';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES } from '@/lib/constants';
import { formatPhone } from '@/lib/validation';

type RegistrationData = {
  id: string;
  name: string;
  company_name: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  industry: string;
  company_size: string;
  referral_source: string;
  referrer_name: string;
  inquiry: string;
  event_id: string;
  registration_status: string;
  event_name: string;
  event_date: string;
  event_type: string;
  event_category: string;
  event_location: string;
  event_time: string;
  survey_enabled: boolean;
  survey_completed: boolean;
  event_status: string;
  event_ended_at: string | null;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
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
          본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75)<br className="sm:hidden" /><span className="hidden sm:inline"> | </span>02-597-3400
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
          marketing@cloocus.com
        </p>
      </div>
    </footer>
  );
}

export default function MyDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupPin, setLookupPin] = useState('');
  const [lookupEventId, setLookupEventId] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [allEvents, setAllEvents] = useState<{ id: string; name: string }[]>([]);

  // 여러 이벤트 선택
  const [multipleEvents, setMultipleEvents] = useState<{ id: string; event_name: string; event_date: string; registration_status: string }[]>([]);
  const [showEventSelect, setShowEventSelect] = useState(false);

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [editable, setEditable] = useState(false);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const [showSurvey, setShowSurvey] = useState(false);
  const [showSurveyChoice, setShowSurveyChoice] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyForm, setSurveyForm] = useState({
    q1: '',
    q2: '',
    q3: [] as string[],
    q4: '',
    q5: [] as string[],
    q3_etc: '',
    q6: '',
  });
  const [surveyErrors, setSurveyErrors] = useState<Record<string, string>>({});
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveyValidationPopup, setSurveyValidationPopup] = useState<string[]>([]);

  // 수정 모드
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editServerError, setEditServerError] = useState('');

  // 폼 옵션
  const [formOptions, setFormOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch('/api/form-options').then((r) => r.json()).then((d) => setFormOptions(d)).catch(() => {});
    fetch('/api/events').then((r) => r.json()).then((d) => setAllEvents(Array.isArray(d) ? d.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })) : [])).catch(() => {});
  }, []);

  const startEdit = () => {
    if (!registration) return;
    // 기타 값 분리
    let industry = registration.industry;
    let industry_etc = '';
    if (industry?.startsWith('기타: ')) { industry_etc = industry.replace('기타: ', ''); industry = '기타'; }
    let referral_source = registration.referral_source;
    let referral_source_etc = '';
    if (referral_source?.startsWith('기타: ')) { referral_source_etc = referral_source.replace('기타: ', ''); referral_source = '기타'; }

    setEditForm({
      name: registration.name,
      company_name: registration.company_name,
      department: registration.department,
      job_title: registration.job_title,
      email: registration.email,
      phone: registration.phone,
      industry,
      industry_etc,
      company_size: registration.company_size,
      referral_source,
      referral_source_etc,
      referrer_name: registration.referrer_name || '',
      inquiry: registration.inquiry || '',
    });
    setEditErrors({});
    setEditServerError('');
    setEditMode(true);
  };

  const handleEditSubmit = async () => {
    // 간단 검증
    const errs: Record<string, string> = {};
    if (!editForm.name?.trim()) errs.name = '성함을 입력해주세요.';
    if (!editForm.company_name?.trim()) errs.company_name = '회사명을 입력해주세요.';
    if (!editForm.department?.trim()) errs.department = '부서명을 입력해주세요.';
    if (!editForm.job_title?.trim()) errs.job_title = '직급을 입력해주세요.';
    if (!editForm.email?.trim()) errs.email = '이메일을 입력해주세요.';
    if (!editForm.phone?.trim()) errs.phone = '연락처를 입력해주세요.';
    if (!editForm.industry) errs.industry = '산업군을 선택해주세요.';
    if (!editForm.company_size) errs.company_size = '기업 규모를 선택해주세요.';
    if (!editForm.referral_source) errs.referral_source = '신청 경로를 선택해주세요.';
    if (editForm.industry === '기타' && !editForm.industry_etc?.trim()) errs.industry_etc = '산업군을 입력해주세요.';
    if (editForm.referral_source === '기타' && !editForm.referral_source_etc?.trim()) errs.referral_source_etc = '신청 경로를 입력해주세요.';
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditSubmitting(true);
    setEditServerError('');
    try {
      const res = await fetch(`/api/register/${registration!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditServerError(data.error || '수정에 실패했습니다.');
        return;
      }
      // 수정 성공 → 다시 조회
      const lookupRes = await fetch('/api/register/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editForm.email || registration!.email, pin }),
      });
      const lookupData = await lookupRes.json();
      if (lookupRes.ok) {
        setRegistration(lookupData.registration);
        setEditable(lookupData.editable);
      }
      setEditMode(false);
    } catch {
      setEditServerError('네트워크 오류가 발생했습니다.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const offlineCategories = ['세미나', '워크샵', '전시회', '스프린트'];
  const showStatus = registration && !['프로모션', '이벤트'].includes(registration.event_category);
  const showQr = registration?.registration_status === 'confirmed' && offlineCategories.includes(registration.event_category);

  // 종료 후 7일 접근 제한
  const isEventEnded = registration?.event_status === 'ended';
  const endedAt = registration?.event_ended_at ? new Date(registration.event_ended_at) : null;
  const endedDaysAgo = endedAt ? Math.floor((Date.now() - endedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isAccessExpired = isEventEnded && endedAt && endedDaysAgo > 7;
  const daysRemaining = isEventEnded && endedAt ? Math.max(0, 7 - endedDaysAgo) : null;

  // 마감/종료 시 개인정보 수정 불가 (editable 재정의)
  const canEditInfo = editable && registration?.event_status === 'open' && registration?.registration_status === 'pending';
  // 설문 수정 가능: 확정자 + 이벤트 날짜 이전
  const eventDatePassed = registration?.event_date ? new Date(registration.event_date) < new Date() : false;
  const canEditSurvey = registration?.registration_status === 'confirmed' && !isAccessExpired && (registration?.event_status !== 'ended');

  const handleLookup = async () => {
    if (!lookupEventId) { setLookupError('이벤트를 선택해주세요.'); return; }
    if (!lookupEmail.trim()) { setLookupError('이메일을 입력해주세요.'); return; }
    if (!/^\d{4}$/.test(lookupPin)) { setLookupError('확인 암호 4자리 숫자를 입력해주세요.'); return; }
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await fetch('/api/register/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lookupEmail, pin: lookupPin, event_id: lookupEventId }),
      });
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || '조회에 실패했습니다.'); return; }
      setPin(lookupPin);

      // 여러 이벤트에 등록한 경우
      if (data.multiple) {
        setMultipleEvents(data.registrations);
        setShowEventSelect(true);
        setAuthenticated(true);
        return;
      }

      setRegistration(data.registration);
      setEditable(data.editable);
      setAuthenticated(true);

      // Load FAQs
      try {
        const faqRes = await fetch('/api/faqs');
        const faqData = await faqRes.json();
        setFaqs(Array.isArray(faqData) ? faqData : []);
      } catch { /* ignore */ }
    } catch {
      setLookupError('네트워크 오류가 발생했습니다.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!registration) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/register/${registration.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '취소에 실패했습니다.');
        return;
      }
      setCancelled(true);
      setShowCancelConfirm(false);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'confirmed') return { text: '등록 확정', bg: 'bg-green-100 text-green-700', icon: '✓' };
    if (status === 'rejected') return { text: '등록 불가', bg: 'bg-red-100 text-red-600', icon: '✕' };
    return { text: '등록 대기', bg: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-center mb-1">신청자 대시보드</h1>
              <p className="text-gray-500 text-center text-sm mb-6">등록 시 입력한 정보로 조회해주세요.</p>

              <div className="space-y-4">
                <div className="field">
                  <label className="text-sm font-medium text-gray-700">등록한 이벤트</label>
                  <select
                    value={lookupEventId}
                    onChange={(e) => { setLookupEventId(e.target.value); setLookupError(''); }}
                  >
                    <option value="">이벤트를 선택해주세요</option>
                    {allEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>{evt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="text-sm font-medium text-gray-700">이메일 주소</label>
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => { setLookupEmail(e.target.value); setLookupError(''); }}
                    placeholder="name@company.com"
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
                  />
                </div>
              </div>

              {lookupError && <p className="text-sm text-red-500 mt-3">{lookupError}</p>}

              <button
                onClick={handleLookup}
                disabled={lookupLoading}
                className="btn-primary w-full mt-6"
              >
                {lookupLoading ? '조회 중...' : '조회하기'}
              </button>

              <a href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-4">
                ← 이벤트 등록하기
              </a>
            </div>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // 이벤트 선택 화면 (동일 이메일로 여러 이벤트 신청한 경우)
  if (showEventSelect && !registration) {
    const loadRegistration = async (regId: string) => {
      try {
        const res = await fetch(`/api/register/${regId}?pin=${encodeURIComponent(pin)}`);
        const data = await res.json();
        if (!res.ok) { alert(data.error || '조회에 실패했습니다.'); return; }
        setRegistration(data.registration);
        setEditable(data.editable);
        setShowEventSelect(false);
        try {
          const faqRes = await fetch('/api/faqs');
          const faqData = await faqRes.json();
          setFaqs(Array.isArray(faqData) ? faqData : []);
        } catch { /* ignore */ }
      } catch { alert('네트워크 오류가 발생했습니다.'); }
    };

    const statusBadge = (s: string) => {
      if (s === 'confirmed') return { text: '등록 확정', cls: 'bg-green-100 text-green-700' };
      if (s === 'rejected') return { text: '등록 불가', cls: 'bg-red-100 text-red-600' };
      return { text: '등록 대기', cls: 'bg-yellow-100 text-yellow-700' };
    };

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-center mb-1">이벤트 선택</h1>
              <p className="text-gray-500 text-center text-sm mb-6">조회할 이벤트를 선택해주세요.</p>

              <div className="space-y-3">
                {multipleEvents.map((evt) => {
                  const badge = statusBadge(evt.registration_status);
                  return (
                    <button
                      key={evt.id}
                      onClick={() => loadRegistration(evt.id)}
                      className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <p className="font-semibold text-base text-gray-900">{evt.event_name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {evt.event_date && (
                          <span className="text-sm text-gray-500">
                            {(() => { const d = new Date(evt.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setAuthenticated(false); setShowEventSelect(false); setMultipleEvents([]); }}
                className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 hover:underline"
              >
                ← 뒤로가기
              </button>
            </div>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // Cancelled screen
  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold mb-2">등록이 취소되었습니다</h2>
            <p className="text-gray-500 text-sm mb-6">이벤트 등록이 정상적으로 취소되었습니다.</p>
            <a href="/" className="btn-primary inline-block">돌아가기</a>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  if (isAccessExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold mb-2">조회 기간이 만료되었습니다</h2>
            <p className="text-gray-500 text-sm mb-2">이벤트 종료 후 7일이 경과하여</p>
            <p className="text-gray-500 text-sm mb-6">신청 내역을 조회할 수 없습니다.</p>
            <p className="text-xs text-gray-400 mb-4">문의: marketing@cloocus.com</p>
            <a href="/" className="btn-primary inline-block">돌아가기</a>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  if (!registration) return null;

  const status = statusLabel(registration.registration_status || 'pending');
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${registration.id}`
    : `/verify/${registration.id}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-5" />
            <button
              onClick={() => { setAuthenticated(false); setRegistration(null); setLookupEmail(''); setLookupPin(''); }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              로그아웃
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-2">신청자 대시보드</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex-1 w-full">
        {isEventEnded && daysRemaining !== null && daysRemaining > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-amber-700 font-medium">이벤트가 종료되었습니다. 조회 가능 기간이 <strong>{daysRemaining}일</strong> 남았습니다.</p>
            <p className="text-xs text-amber-500 mt-1">종료일 기준 7일 이후에는 신청 내역을 조회할 수 없습니다.</p>
          </div>
        )}

        {/* 이벤트 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4" style={{ backgroundColor: '#e0f2fe' }}>
          <div className="flex items-center gap-2 mb-1">
            {registration.event_category && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                {registration.event_category}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              registration.event_type === 'online' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {registration.event_type === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">{registration.event_name}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
            {registration.event_date && (
              <span>{(() => { const d = new Date(registration.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}</span>
            )}
            {registration.event_time && <span>{registration.event_time}</span>}
            {registration.event_location && <span>{registration.event_location}</span>}
          </div>
        </div>

        {/* 등록 상태 (확정 시 QR 영역에서 표시하므로 제외) */}
        {showStatus && registration.registration_status !== 'confirmed' && (
          <div className={`bg-white rounded-xl border p-5 mb-4 ${registration.registration_status === 'rejected' ? 'border-red-200' : 'border-gray-200'}`}>
            {registration.registration_status === 'pending' && (
              <div className={`w-full text-center py-3 rounded-lg font-bold text-base ${status.bg}`}>
                {status.icon} {status.text}
              </div>
            )}
            {registration.registration_status === 'rejected' && (
              <div className="w-full text-center py-3 rounded-lg font-bold text-base bg-red-100 text-red-600">
                귀하의 본 이벤트 등록이 어려운 점 안내드립니다.
              </div>
            )}
            {registration.registration_status === 'pending' && (
              <p className="text-xs text-gray-400 mt-3 text-center">관리자가 등록 상태를 확정하면 업데이트됩니다.</p>
            )}
            {registration.registration_status === 'rejected' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
{`안녕하세요, 클루커스입니다.
클루커스 이벤트에 관심 가지고 신청해 주셔서 진심으로 감사드립니다.

준비된 환경 범위 내에서 참석 인원이 마감됨에 따라
귀하의 본 이벤트 등록이 어려운 점 너른 양해 부탁드립니다.

금번 이벤트에는 함께 모시지 못하지만,
궁금하신 사항이나 기술 도입과 관련해 논의가 필요하시면 언제든지 편히 문의해 주세요.

귀사의 비즈니스 환경에 최적화된 방향으로 상세히 안내 드리겠습니다.

감사합니다.
클루커스 드림`}
              </div>
            )}
          </div>
        )}

        {/* 등록 확정 영역 */}
        {registration.registration_status === 'confirmed' && (
          <>
            {/* 설문조사 미완료 + 설문 활성화 → 선택 화면 또는 설문 버튼 */}
            {registration.survey_enabled && !registration.survey_completed && !surveySubmitted && !showSurvey && !showSurveyChoice && (
              <div className="bg-white rounded-xl border-2 border-green-200 p-6 mb-4 text-center">
                <div className="bg-green-50 rounded-lg p-3 mb-4">
                  <p className="text-green-700 font-bold text-lg">등록이 확정되었습니다</p>
                  <p className="text-green-600 text-sm mt-1">{registration.event_name}</p>
                </div>
                <p className="text-sm text-gray-500 mb-4">이벤트 참여 후 설문조사를 작성해주세요.</p>
                <button onClick={() => setShowSurveyChoice(true)} className="btn-shimmer">
                  설문조사 작성하기
                </button>
              </div>
            )}

            {/* 설문 진입 선택: 저장된 정보 불러오기 / 새로 작성하기 */}
            {showSurveyChoice && !showSurvey && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 text-center">
                <h2 className="text-lg font-bold mb-2">설문조사 시작</h2>
                <p className="text-sm text-gray-500 mb-6">기존에 등록한 개인정보를 어떻게 처리할까요?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowSurveyChoice(false); setShowSurvey(true); }}
                    className="btn-primary flex-1" style={{ padding: '12px 0' }}
                  >
                    저장된 정보 불러오기
                  </button>
                  {registration.event_status === 'open' && (
                  <button
                    onClick={() => { setShowSurveyChoice(false); startEdit(); }}
                    className="btn-secondary flex-1" style={{ padding: '12px 0' }}
                  >
                    개인정보 수정 후 작성
                  </button>
                  )}
                </div>
                <button onClick={() => setShowSurveyChoice(false)} className="text-sm text-gray-400 hover:text-gray-600 mt-3">
                  취소
                </button>
              </div>
            )}

            {/* 설문조사 폼 */}
            {showSurvey && !surveySubmitted && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold">설문조사</h2>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-500">오늘의 경험에 대해 알려주세요.</p>
                  <span className="text-xs text-red-500 shrink-0">* 필수</span>
                </div>

                <div className="space-y-6">
                  {/* Q1 */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">1. 교육 전 Microsoft Azure에 대한 이해 수준은 어느 정도입니까? <span className="text-red-500">*</span></p>
                    {['전혀 모름 (들어봤으나 사용 경험 없음)', '기본 개념 (Azure 역할 및 주요 서비스 이해)', '기초 수준 (리소스 생성 등 기본 실습/사용 경험)', '중급 수준 (가상머신, 스토리지 등 일부 서비스 적용 경험)', '고급 수준 (아키텍처 설계, 최적화 등 고급 기능 숙지)'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="radio" name="q1" value={opt} checked={surveyForm.q1 === opt} onChange={(e) => { setSurveyForm({ ...surveyForm, q1: e.target.value }); setSurveyErrors({ ...surveyErrors, q1: '' }); }} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {surveyErrors.q1 && <p className="text-xs text-red-500 mt-1">{surveyErrors.q1}</p>}
                  </div>

                  {/* Q2 */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">2. 오늘 참여한 이벤트의 난이도는 어떠셨나요? <span className="text-red-500">*</span></p>
                    {['매우 쉬움', '적절함', '다소 어려움', '매우 어려움'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="radio" name="q2" value={opt} checked={surveyForm.q2 === opt} onChange={(e) => { setSurveyForm({ ...surveyForm, q2: e.target.value }); setSurveyErrors({ ...surveyErrors, q2: '' }); }} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {surveyErrors.q2 && <p className="text-xs text-red-500 mt-1">{surveyErrors.q2}</p>}
                  </div>

                  {/* Q3 - multiple choice */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">3. 본 이벤트에 참여하신 목적은 무엇입니까? (복수 선택 가능) <span className="text-red-500">*</span></p>
                    {['기초 지식 및 기본 역량 확보', '클라우드 도입 전 비교/평가', '사내 PoC 프로젝트 준비', 'Azure 전환(마이그레이션) 검토', '사용 중인 Azure 기술 고도화', '기타'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="checkbox" checked={surveyForm.q3.includes(opt)} onChange={(e) => {
                          const next = e.target.checked ? [...surveyForm.q3, opt] : surveyForm.q3.filter((v) => v !== opt);
                          setSurveyForm({ ...surveyForm, q3: next, q3_etc: e.target.checked ? surveyForm.q3_etc : (opt === '기타' ? '' : surveyForm.q3_etc) });
                          setSurveyErrors({ ...surveyErrors, q3: '' });
                        }} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {surveyForm.q3.includes('기타') && (
                      <input type="text" value={surveyForm.q3_etc} onChange={(e) => setSurveyForm({ ...surveyForm, q3_etc: e.target.value })} placeholder="기타 내용을 입력해주세요" className="mt-1 w-full" style={{ padding: '8px 12px', border: `1px solid ${surveyErrors.q3_etc ? '#ef4444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14 }} />
                    )}
                    {surveyErrors.q3 && <p className="text-xs text-red-500 mt-1">{surveyErrors.q3}</p>}
                    {surveyErrors.q3_etc && <p className="text-xs text-red-500 mt-1">{surveyErrors.q3_etc}</p>}
                  </div>

                  {/* Q4 */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">4. 현재 Microsoft Azure 도입 또는 마이그레이션을 고려 중입니까? <span className="text-red-500">*</span></p>
                    {['이미 사용 중 (추가 도입/확장 계획 있음)', '이미 사용 중 (추가 도입/확장 계획 없음)', '6개월 이내 도입 계획 있음', '1년 이내 도입 계획 있음', '계획 없음 / 미정'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="radio" name="q4" value={opt} checked={surveyForm.q4 === opt} onChange={(e) => { setSurveyForm({ ...surveyForm, q4: e.target.value }); setSurveyErrors({ ...surveyErrors, q4: '' }); }} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {surveyErrors.q4 && <p className="text-xs text-red-500 mt-1">{surveyErrors.q4}</p>}
                  </div>

                  {/* Q5 - multiple choice */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">5. Microsoft Azure 추가 활용에 대한 클루커스의 컨설팅이 필요하십니까? (복수 선택 가능) <span className="text-red-500">*</span></p>
                    {['예 (클루커스의 추가 컨설팅 필요)', '예 (교육/세미나 이벤트 소식 필요)', '필요 없음'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="checkbox" checked={surveyForm.q5.includes(opt)} onChange={(e) => {
                          const next = e.target.checked ? [...surveyForm.q5, opt] : surveyForm.q5.filter((v) => v !== opt);
                          setSurveyForm({ ...surveyForm, q5: next });
                          setSurveyErrors({ ...surveyErrors, q5: '' });
                        }} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {surveyErrors.q5 && <p className="text-xs text-red-500 mt-1">{surveyErrors.q5}</p>}
                  </div>

                  {/* Q6 */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">6. 참여 후기, 추가로 배우고 싶은 교육 주제 등 핸즈온 운영에 대한 피드백이 있으시면 편히 말씀 부탁드립니다.</p>
                    <p className="text-xs text-gray-400 mb-2">작성해 주신 피드백은 향후 더 나은 경험 제공을 위해 개선 사항으로 참고하겠습니다.</p>
                    <textarea rows={4} value={surveyForm.q6} onChange={(e) => setSurveyForm({ ...surveyForm, q6: e.target.value })} placeholder="자유롭게 작성해주세요" className="w-full" style={{ padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 }} />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const errs: Record<string, string> = {};
                    if (!surveyForm.q1) errs.q1 = '1번 (Azure 이해 수준)을 선택해주세요.';
                    if (!surveyForm.q2) errs.q2 = '2번 (이벤트 난이도)을 선택해주세요.';
                    if (surveyForm.q3.length === 0) errs.q3 = '3번 (참여 목적)을 하나 이상 선택해주세요.';
                    if (surveyForm.q3.includes('기타') && !surveyForm.q3_etc.trim()) errs.q3_etc = '3번 기타 내용을 입력해주세요.';
                    if (!surveyForm.q4) errs.q4 = '4번 (Azure 도입 계획)을 선택해주세요.';
                    if (surveyForm.q5.length === 0) errs.q5 = '5번 (컨설팅 필요 여부)을 하나 이상 선택해주세요.';
                    setSurveyErrors(errs);
                    if (Object.keys(errs).length > 0) {
                      setSurveyValidationPopup(Object.values(errs));
                      return;
                    }

                    setSurveySubmitting(true);
                    try {
                      const q3Final = surveyForm.q3.map((v) => v === '기타' ? `기타: ${surveyForm.q3_etc}` : v);
                      const res = await fetch('/api/survey', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          registration_id: registration.id,
                          pin,
                          q1_azure_level: surveyForm.q1,
                          q2_difficulty: surveyForm.q2,
                          q3_purpose: q3Final,
                          q4_adoption: surveyForm.q4,
                          q5_consulting: surveyForm.q5,
                          q6_feedback: surveyForm.q6,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) { alert(data.error || '제출에 실패했습니다.'); return; }
                      setSurveySubmitted(true);
                      setShowSurvey(false);
                      if (registration) {
                        setRegistration({ ...registration, survey_completed: true });
                      }
                    } catch { alert('네트워크 오류가 발생했습니다.'); }
                    finally { setSurveySubmitting(false); }
                  }}
                  disabled={surveySubmitting}
                  className="btn-primary w-full mt-6"
                >
                  {surveySubmitting ? '제출 중...' : '제출하기'}
                </button>
              </div>
            )}

            {/* 설문 검증 오류 팝업 */}
            {surveyValidationPopup.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-red-500 text-xl">⚠</span>
                    <h3 className="text-lg font-bold text-gray-900">입력 정보를 확인해주세요</h3>
                  </div>
                  <ul className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {surveyValidationPopup.map((msg, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setSurveyValidationPopup([])} className="btn-primary w-full">확인</button>
                </div>
              </div>
            )}

            {/* 설문 완료 화면 */}
            {(surveySubmitted || (registration.survey_enabled && registration.survey_completed)) && !showSurvey && !showSurveyChoice && (
              <div className="bg-white rounded-xl border-2 border-green-200 p-6 mb-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-gray-900 mb-2">설문조사 제출이 완료되었습니다!</p>
                <p className="text-sm text-gray-500 mb-4">오늘의 경험을 공유해 주셔서 감사합니다.</p>

                {/* 수료증 다운로드 */}
                <button
                  onClick={async () => {
                    try {
                      const html2canvas = (await import('html2canvas')).default;
                      const { jsPDF } = await import('jspdf');

                      const issueDate = new Date();
                      const evtDate = new Date(registration.event_date);
                      const issueDateStr = `${issueDate.getFullYear()}. ${String(issueDate.getMonth()+1).padStart(2,'0')}. ${String(issueDate.getDate()).padStart(2,'0')}`;
                      const periodStr = `${evtDate.getFullYear()}. ${String(evtDate.getMonth()+1).padStart(2,'0')}. ${String(evtDate.getDate()).padStart(2,'0')}`;

                      // 위조 방지: 고유 인증번호 생성
                      const certId = `CLO-${registration.id.slice(0,8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                      const verifyQr = `${window.location.origin}/verify/${registration.id}`;

                      const certEl = document.createElement('div');
                      certEl.style.cssText = 'position:fixed;left:-9999px;top:0;width:1122px;height:794px;font-family:"Noto Sans KR",sans-serif;overflow:hidden;';
                      certEl.innerHTML = `
                        <div style="display:flex;width:100%;height:100%;background:#fff;">
                          <!-- 좌측 60% -->
                          <div style="width:60%;height:100%;padding:48px 50px 38px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
                            <!-- 좌측 상단: 로고 -->
                            <img src="/cloocus-logo.png" style="width:120px;height:auto;" crossorigin="anonymous" />

                            <!-- 좌측 중심: CERTIFICATE OF COMPLETION -->
                            <div>
                              <p style="font-size:64px;font-weight:800;color:#1a1a1a;letter-spacing:5px;margin:0 0 28px;line-height:1;">CERTIFICATE</p>
                              <p style="font-size:22px;font-weight:500;color:#999;margin:0 0 0 3px;letter-spacing:4px;">OF COMPLETION</p>
                              <div style="width:80px;height:3px;background:#4c2d96;margin-top:20px;border-radius:2px;"></div>
                            </div>

                            <!-- 좌측 하단: CEO + Issued on + Issued by + QR (1열, 동일 레벨) -->
                            <div style="display:flex;gap:30px;align-items:flex-start;">
                              <!-- CEO + 날인 -->
                              <div>
                                <p style="font-size:10px;color:#4c2d96;margin:0 0 4px;font-weight:600;letter-spacing:1px;">Cloocus CEO</p>
                                <p style="font-size:14px;font-weight:700;color:#222;margin:0 0 4px;">Steve Hong</p>
                                <img src="/stamp.jpg" style="width:70px;height:auto;margin-top:4px;" crossorigin="anonymous" />
                              </div>
                              <!-- Issued on -->
                              <div>
                                <p style="font-size:10px;color:#4c2d96;margin:0 0 4px;font-weight:600;letter-spacing:1px;">Issued on</p>
                                <p style="font-size:14px;font-weight:700;color:#222;margin:0;">${issueDateStr}</p>
                              </div>
                              <!-- Issued by -->
                              <div>
                                <p style="font-size:10px;color:#4c2d96;margin:0 0 4px;font-weight:600;letter-spacing:1px;">Issued by</p>
                                <p style="font-size:14px;font-weight:700;color:#222;margin:0;">Cloocus co.,Ltd.</p>
                              </div>
                              <!-- 위조방지 QR + 인증번호 -->
                              <div style="display:flex;align-items:flex-start;gap:10px;margin-left:auto;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyQr)}" style="width:52px;height:52px;" crossorigin="anonymous" />
                                <div style="padding-top:2px;">
                                  <p style="font-size:9px;color:#999;margin:0 0 2px;font-weight:600;">Certificate ID</p>
                                  <p style="font-size:10px;color:#666;margin:0;font-family:monospace;letter-spacing:0.5px;">${certId}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- 구분선 -->
                          <div style="width:1px;background:linear-gradient(180deg,transparent 5%,#e0dce8 20%,#e0dce8 80%,transparent 95%);"></div>

                          <!-- 우측 40% -->
                          <div style="width:40%;height:100%;background:linear-gradient(160deg,#5b35a8 0%,#3a1d80 40%,#1a1045 100%);padding:35px 32px;display:flex;flex-direction:column;box-sizing:border-box;position:relative;">
                            <!-- 인증 마크 -->
                            <div style="width:150px;height:150px;border-radius:50%;border:3px solid rgba(255,255,255,0.2);display:flex;flex-direction:column;align-items:center;justify-content:center;position:absolute;top:20px;right:20px;background:radial-gradient(circle,rgba(100,70,200,0.35) 0%,transparent 70%);">
                              <div style="width:125px;height:125px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <div style="width:100px;height:100px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                  <p style="font-size:16px;font-weight:800;color:#fff;margin:0;letter-spacing:2px;">VERIFIED</p>
                                  <div style="width:45px;height:1.5px;background:rgba(255,255,255,0.5);margin:5px 0;"></div>
                                  <p style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.75);margin:0;letter-spacing:2.5px;">OFFICIAL</p>
                                </div>
                              </div>
                            </div>

                            <!-- 수료자 정보 -->
                            <div style="margin-top:160px;">
                              <p style="font-size:10px;color:rgba(180,170,220,0.8);margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Name</p>
                              <p style="font-size:24px;font-weight:700;color:#fff;margin:0 0 22px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:12px;">${registration.name}</p>

                              <p style="font-size:10px;color:rgba(180,170,220,0.8);margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Course Name</p>
                              <p style="font-size:15px;font-weight:600;color:#fff;margin:0 0 22px;line-height:1.5;word-break:keep-all;">${registration.event_name}</p>

                              <p style="font-size:10px;color:rgba(180,170,220,0.8);margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Period</p>
                              <p style="font-size:15px;font-weight:600;color:#fff;margin:0 0 28px;">${periodStr}</p>

                              <!-- 인증 문구 (PERIOD 바로 아래) -->
                              <p style="font-size:16px;font-weight:600;color:#fff;margin:0;line-height:2;word-break:keep-all;">위 사람은 클루커스의 &ldquo;${registration.event_name}&rdquo;에</p>
                              <p style="font-size:16px;font-weight:600;color:#fff;margin:0;line-height:2;">참석하시어 성실히 이수하였기에 이 증서를 수여합니다.</p>
                            </div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(certEl);

                      // 이미지 로드 대기
                      const imgs = certEl.querySelectorAll('img');
                      await Promise.all(Array.from(imgs).map((img) =>
                        img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); setTimeout(r, 2000); })
                      ));

                      const canvas = await html2canvas(certEl, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
                      document.body.removeChild(certEl);

                      const imgData = canvas.toDataURL('image/png');
                      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                      doc.addImage(imgData, 'PNG', 0, 0, 297, 210);

                      // PDF 메타데이터 (위조 방지)
                      doc.setProperties({
                        title: `수료증 - ${registration.name}`,
                        subject: registration.event_name,
                        author: 'Cloocus co.,ltd.',
                        creator: `Cloocus Event System | ${certId}`,
                      });

                      doc.save(`수료증_${registration.name}_${registration.event_name}.pdf`);

                      // 발급 기록
                      fetch('/api/certificate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ registration_id: registration.id, pin }),
                      }).catch(() => {});
                    } catch (err) {
                      alert('PDF 생성 중 오류: ' + String(err));
                    }
                  }}
                  className="btn-primary mb-3"
                >
                  수료증 발급하기 (PDF)
                </button>
                <p className="text-xs text-red-500 mt-2">수료증 발급은 이벤트 종료일 기준 7일 이후에는 발급이 불가합니다.</p>

                {canEditSurvey && (
                <div className="text-right mt-3">
                  <button
                    onClick={async () => {
                      // 기존 응답 불러오기
                      try {
                        const res = await fetch(`/api/survey?registration_id=${registration.id}&pin=${encodeURIComponent(pin)}`);
                        const data = await res.json();
                        if (data.exists && data.survey) {
                          const s = data.survey;
                          const q3 = (s.q3_purpose || []) as string[];
                          let q3_etc = '';
                          const q3Clean = q3.map((v: string) => {
                            if (v.startsWith('기타: ')) { q3_etc = v.replace('기타: ', ''); return '기타'; }
                            return v;
                          });
                          setSurveyForm({
                            q1: s.q1_azure_level || '',
                            q2: s.q2_difficulty || '',
                            q3: q3Clean,
                            q4: s.q4_adoption || '',
                            q5: (s.q5_consulting || []) as string[],
                            q3_etc,
                            q6: s.q6_feedback || '',
                          });
                        }
                      } catch { /* 불러오기 실패 시 빈 폼 */ }
                      setSurveySubmitted(false);
                      setShowSurvey(true);
                      setSurveyErrors({});
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    설문조사 수정하기
                  </button>
                </div>
                )}
              </div>
            )}

            {/* 설문 미활성화 상태 (기존 확정 화면) */}
            {!registration.survey_enabled && !surveySubmitted && (
              <div className="bg-white rounded-xl border-2 border-green-200 p-6 mb-4 text-center">
                <div className="bg-green-50 rounded-lg p-3 mb-4">
                  <p className="text-green-700 font-bold text-lg">등록이 확정되었습니다</p>
                  <p className="text-green-600 text-sm mt-1">{registration.event_name}</p>
                </div>
                {showQr && (
                  <>
                    <p className="text-xs text-gray-500 mb-3">이벤트 현장에서 아래 QR코드를 제시해주세요.</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`}
                      alt="QR Code"
                      className="mx-auto border border-gray-100 rounded-lg p-2"
                      width={200}
                      height={200}
                    />
                    <p className="text-xs text-gray-400 mt-3">{registration.name} | {registration.company_name}</p>
                    <p className="text-[10px] text-gray-300 mt-1">QR 스캔 시 참석자 검증 페이지로 연결됩니다</p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* 신청 내역 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">신청 내역</h2>
          <div className="space-y-3">
            {[
              ['성함', registration.name],
              ['회사명', registration.company_name],
              ['부서명', registration.department],
              ['직급', registration.job_title],
              ['이메일', registration.email],
              ['연락처', registration.phone],
              ['산업군', registration.industry],
              ['기업 규모', registration.company_size],
              ['신청 경로', registration.referral_source],
              ...(registration.referrer_name ? [['추천인', registration.referrer_name]] : []),
              ...(registration.inquiry ? [['문의사항', registration.inquiry]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-sm text-gray-400 w-20 shrink-0">{label}</span>
                <span className="text-sm text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 문의 이메일 (등록 불가 시) */}
        {registration.registration_status === 'rejected' && showStatus && (
          <div className="mb-4 text-center py-3">
            <p className="text-sm text-gray-500">문의사항 | 📧 <a href="mailto:marketing@cloocus.com" className="text-blue-600 hover:underline">marketing@cloocus.com</a></p>
          </div>
        )}

        {/* 수정 폼 */}
        {editMode && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">신청 내역 수정</h2>
            {editServerError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{editServerError}</div>
            )}
            <div className="space-y-4">
              {[
                ['name', '성함', 'text'],
                ['company_name', '회사명', 'text'],
                ['department', '부서명', 'text'],
                ['job_title', '직급', 'text'],
                ['email', '이메일', 'email'],
              ].map(([key, label, type]) => (
                <div key={key} className="field">
                  <label className="text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
                  <input
                    type={type}
                    value={editForm[key] || ''}
                    onChange={(e) => { setEditForm({ ...editForm, [key]: e.target.value }); setEditErrors({ ...editErrors, [key]: '' }); }}
                    className={editErrors[key] ? 'error' : ''}
                  />
                  {editErrors[key] && <span className="error-msg">{editErrors[key]}</span>}
                </div>
              ))}
              <div className="field">
                <label className="text-sm font-medium text-gray-700">연락처 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.phone || ''}
                  onChange={(e) => { setEditForm({ ...editForm, phone: formatPhone(e.target.value) }); setEditErrors({ ...editErrors, phone: '' }); }}
                  maxLength={13}
                  className={editErrors.phone ? 'error' : ''}
                />
                {editErrors.phone && <span className="error-msg">{editErrors.phone}</span>}
              </div>
              <div className="field">
                <label className="text-sm font-medium text-gray-700">산업군 <span className="text-red-500">*</span></label>
                <select value={editForm.industry || ''} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value, industry_etc: '' })} className={editErrors.industry ? 'error' : ''}>
                  <option value="">선택해주세요</option>
                  {(formOptions.industry || INDUSTRIES).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {editErrors.industry && <span className="error-msg">{editErrors.industry}</span>}
                {editForm.industry === '기타' && (
                  <>
                    <input type="text" value={editForm.industry_etc || ''} onChange={(e) => setEditForm({ ...editForm, industry_etc: e.target.value })} placeholder="산업군을 입력해주세요 *" className="mt-2" style={{ padding: '10px 12px', border: `1px solid ${editErrors.industry_etc ? '#ef4444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, width: '100%' }} />
                    {editErrors.industry_etc && <span className="error-msg">{editErrors.industry_etc}</span>}
                  </>
                )}
              </div>
              <div className="field">
                <label className="text-sm font-medium text-gray-700">기업 규모 <span className="text-red-500">*</span></label>
                <select value={editForm.company_size || ''} onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })} className={editErrors.company_size ? 'error' : ''}>
                  <option value="">선택해주세요</option>
                  {(formOptions.company_size || COMPANY_SIZES).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {editErrors.company_size && <span className="error-msg">{editErrors.company_size}</span>}
              </div>
              <div className="field">
                <label className="text-sm font-medium text-gray-700">신청 경로 <span className="text-red-500">*</span></label>
                <select value={editForm.referral_source || ''} onChange={(e) => setEditForm({ ...editForm, referral_source: e.target.value, referral_source_etc: '', referrer_name: '' })} className={editErrors.referral_source ? 'error' : ''}>
                  <option value="">선택해주세요</option>
                  {(formOptions.referral_source || REFERRAL_SOURCES).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {editErrors.referral_source && <span className="error-msg">{editErrors.referral_source}</span>}
                {editForm.referral_source === '기타' && (
                  <>
                    <input type="text" value={editForm.referral_source_etc || ''} onChange={(e) => setEditForm({ ...editForm, referral_source_etc: e.target.value })} placeholder="신청 경로를 입력해주세요 *" className="mt-2" style={{ padding: '10px 12px', border: `1px solid ${editErrors.referral_source_etc ? '#ef4444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, width: '100%' }} />
                    {editErrors.referral_source_etc && <span className="error-msg">{editErrors.referral_source_etc}</span>}
                  </>
                )}
              </div>
              {(editForm.referral_source === '클루커스 담당자 소개' || editForm.referral_source === '외부 담당자 소개') && (
                <div className="field">
                  <label className="text-sm font-medium text-gray-700">추천인 성명</label>
                  <input type="text" value={editForm.referrer_name || ''} onChange={(e) => setEditForm({ ...editForm, referrer_name: e.target.value })} placeholder="추천인 성명" />
                </div>
              )}
              <div className="field">
                <label className="text-sm font-medium text-gray-700">문의사항</label>
                <textarea rows={3} value={editForm.inquiry || ''} onChange={(e) => setEditForm({ ...editForm, inquiry: e.target.value })} placeholder="문의사항 (선택)" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEditSubmit} disabled={editSubmitting} className="btn-primary flex-1">
                {editSubmitting ? '저장 중...' : '저장하기'}
              </button>
              <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        )}

        {/* 버튼 그룹 */}
        {!editMode && (
          <div className="flex gap-3 mb-4">
            <a href="/" className="btn-primary flex-1 text-center" style={{ padding: '12px 0', fontSize: 15 }}>
              확인 완료
            </a>
            {canEditInfo && (
              <button onClick={startEdit} className="btn-secondary flex-1" style={{ padding: '12px 0', fontSize: 15, fontWeight: 600 }}>
                수정하기
              </button>
            )}
            {canEditInfo && (
              <button onClick={() => setShowCancelConfirm(true)} className="btn-danger flex-1" style={{ padding: '12px 0', fontSize: 15, fontWeight: 600 }}>
                등록 취소
              </button>
            )}
          </div>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowFaq(!showFaq)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-700">자주 묻는 질문 (FAQ)</span>
              <span className="text-gray-400">{showFaq ? '▲' : '▼'}</span>
            </button>
            {showFaq && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {faqs.map((faq, i) => (
                  <div key={faq.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                    <button
                      onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                      className="w-full text-left px-5 py-4 flex items-start justify-between hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-800 pr-4">Q. {faq.question}</span>
                      <span className="text-gray-400 shrink-0">{openFaqId === faq.id ? '−' : '+'}</span>
                    </button>
                    {openFaqId === faq.id && (
                      <div className="px-5 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BrandFooter />

      {/* 등록 취소 확인 모달 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold mb-2">등록을 취소하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-6">취소 후에는 다시 등록해야 합니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="btn-secondary flex-1">아니오</button>
              <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1">
                {cancelling ? '취소 중...' : '등록 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
