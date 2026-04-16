'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdmin } from '../layout';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES } from '@/lib/constants';
import { formatPhone } from '@/lib/validation';
import type { Registration, Event } from '@/lib/types';

type SortKey = keyof Registration;

export default function RegistrationsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [records, setRecords] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 필터
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterEmailStatus, setFilterEmailStatus] = useState('');
  const [events, setEvents] = useState<Event[]>([]);

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // 선택
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 수정 모달
  const [editing, setEditing] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registration>>({});
  const [saving, setSaving] = useState(false);

  // 삭제 확인
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // 일괄 등록 상태 변경
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  // 일괄 설문조사 On/Off
  const [showBulkSurvey, setShowBulkSurvey] = useState(false);
  const [bulkSurveyApplying, setBulkSurveyApplying] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'confirmed' | 'rejected'>('confirmed');
  const [bulkStatusApplying, setBulkStatusApplying] = useState(false);

  // 이메일 발송 모달
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailType, setEmailType] = useState<'confirmed' | 'rejected'>('confirmed');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ successCount: number; failCount: number; errorDetail?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const limit = 50;

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const initialLoad = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const fetchRecords = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (initialLoad.current) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: sortKey,
        order: sortAsc ? 'asc' : 'desc',
      });
      if (search) params.set('search', search);
      if (filterEvent) params.set('event_id', filterEvent);
      if (filterIndustry) params.set('industry', filterIndustry);
      if (filterSize) params.set('company_size', filterSize);
      if (filterSource) params.set('referral_source', filterSource);
      if (filterYear) params.set('year', filterYear);
      if (filterEmailStatus) params.set('email_status', filterEmailStatus);

      const res = await fetch(`/api/admin/registrations?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      const data = await res.json();
      setRecords(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [accessToken, page, sortKey, sortAsc, search, filterEvent, filterIndustry, filterSize, filterSource, filterYear, filterEmailStatus]);

  useEffect(() => {
    if (accessToken) fetchRecords();
  }, [accessToken, fetchRecords]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (selected.size > 0) {
      params.set('ids', Array.from(selected).join(','));
    }
    const res = await fetch(`/api/admin/export?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloocus_event_${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (record: Registration) => {
    setEditing(record);
    setEditForm({ ...record });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/registrations/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditing(null); fetchRecords(); }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { setDeleting(null); fetchRecords(); }
    } catch { /* ignore */ }
  };

  const handleBulkDelete = async () => {
    setShowBulkDelete(false);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) =>
      fetch('/api/admin/registrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id }),
      }).catch(() => {})
    ));
    setSelected(new Set());
    fetchRecords();
  };

  // 선택
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };

  // 이메일 발송
  const handleSendEmail = async () => {
    if (selected.size === 0) return;
    setSending(true);
    setSendResult(null);

    // 선택된 등록자의 event_id 추출 (첫 번째 것 사용)
    const selectedRecords = records.filter((r) => selected.has(r.id));
    const eventId = filterEvent || selectedRecords[0]?.event_id;

    if (!eventId) {
      setSendResult({ successCount: 0, failCount: selected.size });
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          registration_ids: Array.from(selected),
          email_type: emailType,
          event_id: eventId,
        }),
      });
      const data = await res.json();
      const firstError = data.results?.find((r: { success: boolean; error?: string }) => !r.success)?.error || '';
      const debugInfo = data.stibeeDebug ? `\n[Debug] apiKey:${data.stibeeDebug.hasApiKey} listId:${data.stibeeDebug.hasListId} sendKey:${data.stibeeDebug.hasSendKey} connected:${data.stibeeConnected}` : '';
      setSendResult({ successCount: data.successCount || 0, failCount: data.failCount || 0, errorDetail: (firstError || data.error || '') + debugInfo });
      fetchRecords();
    } catch (err) {
      setSendResult({ successCount: 0, failCount: selected.size, errorDetail: String(err) });
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const canEditRecord = admin?.role === 'admin' || admin?.role === 'editor';
  const canDeleteRecord = admin?.role === 'admin';
  const sortIcon = (key: SortKey) => sortKey !== key ? '' : sortAsc ? ' ↑' : ' ↓';

  // 등록년도 옵션 생성
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const registrationStatusLabel = (status: string | null) => {
    if (status === 'confirmed') return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">등록 확정</span>;
    if (status === 'rejected') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">등록 불가</span>;
    return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">등록 대기</span>;
  };

  const emailStatusLabel = (status: string | null) => {
    if (status === 'confirmed') return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">확정 발송</span>;
    if (status === 'rejected') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">불가 발송</span>;
    return <span className="text-xs text-gray-400">미발송</span>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">등록 리스트 ({total}건)</h1>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && canDeleteRecord && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="btn-danger text-sm"
            >
              선택 삭제 ({selected.size})
            </button>
          )}
          {selected.size > 0 && canEditRecord && (
            <button
              onClick={() => setShowBulkStatus(true)}
              className="text-sm px-3 py-2 rounded-lg font-medium border border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
            >
              등록 상태 변경 ({selected.size})
            </button>
          )}
          {selected.size > 0 && canEditRecord && (
            <button
              onClick={() => setShowBulkSurvey(true)}
              className="text-sm px-3 py-2 rounded-lg font-medium border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              설문조사 ({selected.size})
            </button>
          )}
          {selected.size > 0 && canEditRecord && (
            <button
              onClick={() => { setShowEmailModal(true); setSendResult(null); }}
              className="btn-primary text-sm"
            >
              이메일 발송 ({selected.size})
            </button>
          )}
          <button onClick={() => handleExport('xlsx')} className="btn-secondary text-sm">XLSX{selected.size > 0 ? ` (${selected.size})` : ''}</button>
          <button onClick={() => handleExport('csv')} className="btn-secondary text-sm">CSV</button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="이름, 회사, 이메일 검색..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            clearTimeout(searchDebounce.current);
            searchDebounce.current = setTimeout(() => { setSearch(e.target.value); setPage(1); }, 300);
          }}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select value={filterEvent} onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">이벤트 전체</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">등록년도 전체</option>
          {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={filterIndustry} onChange={(e) => { setFilterIndustry(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">산업군 전체</option>
          {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterSize} onChange={(e) => { setFilterSize(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">기업 규모 전체</option>
          {COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">신청 경로 전체</option>
          {REFERRAL_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterEmailStatus} onChange={(e) => { setFilterEmailStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">이메일 전체</option>
          <option value="not_sent">미발송</option>
          <option value="confirmed">확정 발송</option>
          <option value="rejected">불가 발송</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={records.length > 0 && selected.size === records.length} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-blue-600" />
                </th>
                {[
                  { key: 'event_id' as SortKey, label: '이벤트' },
                  { key: 'name' as SortKey, label: '성함' },
                  { key: 'company_name' as SortKey, label: '회사명' },
                  { key: 'email' as SortKey, label: '이메일' },
                  { key: 'phone' as SortKey, label: '연락처' },
                  { key: 'industry' as SortKey, label: '산업군' },
                  { key: 'referral_source' as SortKey, label: '신청 경로' },
                  { key: 'created_at' as SortKey, label: '등록일' },
                  { key: 'registration_status' as SortKey, label: '등록 상태' },
                  { key: 'survey_enabled' as SortKey, label: '설문조사' },
                ].map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort(col.key)}>
                    {col.label}{sortIcon(col.key)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">이메일 상태</th>
                {(canEditRecord || canDeleteRecord) && (
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-24">작업</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-gray-400">등록 데이터가 없습니다.</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-[150px] truncate">{r.event_id ? (events.find((e) => e.id === r.event_id)?.name || '-') : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.industry}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.referral_source}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canEditRecord ? (
                      <select
                        value={r.registration_status || 'pending'}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          // 옵티미스틱 업데이트
                          setRecords((prev) => prev.map((rec) => rec.id === r.id ? { ...rec, registration_status: newStatus as Registration['registration_status'] } : rec));
                          fetch(`/api/admin/registrations/${r.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                            body: JSON.stringify({ registration_status: newStatus }),
                          });
                        }}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1"
                      >
                        <option value="pending">등록 대기</option>
                        <option value="confirmed">등록 확정</option>
                        <option value="rejected">등록 불가</option>
                      </select>
                    ) : (
                      registrationStatusLabel(r.registration_status)
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.registration_status === 'confirmed' ? (
                      <button
                        onClick={async () => {
                          const newVal = !(r.survey_enabled);
                          setRecords((prev) => prev.map((rec) => rec.id === r.id ? { ...rec, survey_enabled: newVal } as Registration : rec));
                          fetch(`/api/admin/registrations/${r.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                            body: JSON.stringify({ survey_enabled: newVal }),
                          });
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.survey_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {r.survey_enabled ? (r.survey_completed ? '완료' : 'On') : 'Off'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{emailStatusLabel(r.email_status)}</td>
                  {(canEditRecord || canDeleteRecord) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {canEditRecord && <button onClick={() => handleEdit(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">수정</button>}
                        {canDeleteRecord && <button onClick={() => setDeleting(r.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">{(page - 1) * limit + 1}~{Math.min(page * limit, total)} / {total}건</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">이전</button>
              <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn-secondary text-xs disabled:opacity-40">다음</button>
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">등록 정보 수정</h2>
            <div className="space-y-4">
              {([['name', '성함'], ['company_name', '회사명'], ['department', '부서명'], ['job_title', '직급'], ['email', '이메일']] as const).map(([key, label]) => (
                <div key={key} className="field">
                  <label>{label}</label>
                  <input type="text" value={String(editForm[key] || '')} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
                </div>
              ))}
              <div className="field"><label>연락처</label><input type="tel" value={String(editForm.phone || '')} onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })} maxLength={13} /></div>
              <div className="field"><label>산업군</label><select value={editForm.industry || ''} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}>{INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="field"><label>기업 규모</label><select value={editForm.company_size || ''} onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}>{COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="field"><label>신청 경로</label><select value={editForm.referral_source || ''} onChange={(e) => setEditForm({ ...editForm, referral_source: e.target.value })}>{REFERRAL_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="field"><label>추천인</label><input type="text" value={String(editForm.referrer_name || '')} onChange={(e) => setEditForm({ ...editForm, referrer_name: e.target.value })} /></div>
              <div className="field"><label>문의사항</label><textarea rows={3} value={String(editForm.inquiry || '')} onChange={(e) => setEditForm({ ...editForm, inquiry: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? '저장 중...' : '저장'}</button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">등록 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 등록 정보를 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleting)} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">등록 일괄 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">
              선택한 {selected.size}건의 등록 정보를 삭제하시겠습니까?<br />
              <span className="text-xs text-red-500 mt-1 block">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex gap-2">
              <button onClick={handleBulkDelete} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setShowBulkDelete(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 이메일 발송 모달 */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">이메일 발송하기</h2>

            {sendResult ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-lg font-semibold mb-2">발송 완료</p>
                <p className="text-sm text-gray-500">성공: {sendResult.successCount}건 / 실패: {sendResult.failCount}건</p>
                {sendResult.errorDetail && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg text-red-600 text-xs text-left break-all">
                    {sendResult.errorDetail}
                  </div>
                )}
                <button onClick={() => { setShowEmailModal(false); setSelected(new Set()); setSendResult(null); }} className="btn-primary mt-6 w-full">확인</button>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">선택된 대상: <strong>{selected.size}명</strong></p>
                  {filterEvent && (
                    <p className="text-sm text-gray-600 mt-1">이벤트: <strong>{events.find((e) => e.id === filterEvent)?.name || '-'}</strong></p>
                  )}
                </div>

                {!filterEvent && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    이벤트 필터를 선택하면 해당 이벤트 정보가 이메일에 포함됩니다.
                  </div>
                )}

                <div className="field mb-4">
                  <label>이메일 유형</label>
                  <select value={emailType} onChange={(e) => setEmailType(e.target.value as 'confirmed' | 'rejected')}>
                    <option value="confirmed">등록 확정 이메일</option>
                    <option value="rejected">등록 불가 이메일</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const eid = filterEvent || records.filter((r) => selected.has(r.id))[0]?.event_id;
                    if (!eid) return;
                    try {
                      const res = await fetch(`/api/admin/email?event_id=${eid}&email_type=${emailType}`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      const data = await res.json();
                      setPreviewSubject(data.subject || '');
                      setPreviewHtml(data.html || '');
                      setShowPreview(true);
                    } catch { /* ignore */ }
                  }}
                  className="text-sm text-blue-600 hover:underline mb-4 block"
                >
                  이메일 미리보기
                </button>

                {showPreview && previewHtml && (
                  <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs text-gray-500">제목</p>
                      <p className="text-sm font-semibold">{previewSubject}</p>
                    </div>
                    <div
                      className="p-2 bg-white max-h-[300px] overflow-y-auto"
                      style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%' }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={handleSendEmail} disabled={sending} className="btn-primary flex-1">
                    {sending ? '발송 중...' : `${selected.size}명에게 발송`}
                  </button>
                  <button onClick={() => setShowEmailModal(false)} className="btn-secondary flex-1">취소</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 일괄 등록 상태 변경 모달 */}
      {showBulkStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">등록 상태 일괄 변경</h2>
            <p className="text-sm text-gray-500 mb-4">선택한 <strong>{selected.size}건</strong>의 등록 상태를 변경합니다.</p>
            <div className="field mb-4">
              <label>변경할 상태</label>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as 'confirmed' | 'rejected')}>
                <option value="confirmed">등록 확정</option>
                <option value="rejected">등록 불가</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                disabled={bulkStatusApplying}
                onClick={async () => {
                  setBulkStatusApplying(true);
                  const ids = Array.from(selected);
                  await Promise.all(
                    ids.map((id) =>
                      fetch(`/api/admin/registrations/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: JSON.stringify({ registration_status: bulkStatus }),
                      })
                    )
                  );
                  setBulkStatusApplying(false);
                  setShowBulkStatus(false);
                  setSelected(new Set());
                  fetchRecords();
                }}
                className="btn-primary flex-1"
              >
                {bulkStatusApplying ? '적용 중...' : '적용'}
              </button>
              <button onClick={() => setShowBulkStatus(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 설문조사 On/Off 모달 */}
      {showBulkSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">설문조사 일괄 설정</h2>
            <p className="text-sm text-gray-500 mb-4">선택한 <strong>{selected.size}건</strong>의 설문조사 상태를 변경합니다.</p>
            <div className="flex gap-2">
              <button
                disabled={bulkSurveyApplying}
                onClick={async () => {
                  setBulkSurveyApplying(true);
                  const ids = Array.from(selected);
                  await Promise.all(ids.map((id) =>
                    fetch(`/api/admin/registrations/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ survey_enabled: true }),
                    })
                  ));
                  setRecords((prev) => prev.map((r) => ids.includes(r.id) ? { ...r, survey_enabled: true } as Registration : r));
                  setBulkSurveyApplying(false);
                  setShowBulkSurvey(false);
                  setSelected(new Set());
                }}
                className="btn-primary flex-1"
              >
                {bulkSurveyApplying ? '적용 중...' : '일괄 On'}
              </button>
              <button
                disabled={bulkSurveyApplying}
                onClick={async () => {
                  setBulkSurveyApplying(true);
                  const ids = Array.from(selected);
                  await Promise.all(ids.map((id) =>
                    fetch(`/api/admin/registrations/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ survey_enabled: false }),
                    })
                  ));
                  setRecords((prev) => prev.map((r) => ids.includes(r.id) ? { ...r, survey_enabled: false } as Registration : r));
                  setBulkSurveyApplying(false);
                  setShowBulkSurvey(false);
                  setSelected(new Set());
                }}
                className="btn-danger flex-1"
              >
                {bulkSurveyApplying ? '적용 중...' : '일괄 Off'}
              </button>
              <button onClick={() => setShowBulkSurvey(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
