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
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pin, setPin] = useState('');

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [editable, setEditable] = useState(false);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // 수정 모드
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editServerError, setEditServerError] = useState('');

  // 폼 옵션
  const [formOptions, setFormOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch('/api/form-options')
      .then((r) => r.json())
      .then((d) => setFormOptions(d))
      .catch(() => {});
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

  const handleLookup = async () => {
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
      if (!res.ok) { setLookupError(data.error || '조회에 실패했습니다.'); return; }
      setRegistration(data.registration);
      setEditable(data.editable);
      setPin(lookupPin);
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

        {/* 등록 상태 */}
        {showStatus && (
          <div className={`bg-white rounded-xl border p-5 mb-4 ${registration.registration_status === 'rejected' ? 'border-red-200' : 'border-gray-200'}`}>
            {registration.registration_status !== 'rejected' && (
              <>
                <h2 className="text-sm font-medium text-gray-500 mb-3">등록 여부</h2>
                <div className={`w-full text-center py-3 rounded-lg font-bold text-base ${status.bg}`}>
                  {status.icon} {status.text}
                </div>
              </>
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

        {/* QR 코드 (등록 확정 + 오프라인 카테고리) */}
        {showQr && (
          <div className="bg-white rounded-xl border-2 border-green-200 p-6 mb-4 text-center">
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <p className="text-green-700 font-bold text-lg">등록이 확정되었습니다</p>
              <p className="text-green-600 text-sm mt-1">{registration.event_name}</p>
            </div>
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
          </div>
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
            {editable && (
              <button onClick={startEdit} className="btn-secondary flex-1" style={{ padding: '12px 0', fontSize: 15, fontWeight: 600 }}>
                수정하기
              </button>
            )}
            {editable && (
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
