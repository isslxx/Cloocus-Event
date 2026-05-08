'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../layout';
import type { Registration, Event } from '@/lib/types';

type SortKey = keyof Registration;
type CustomQuestion = { id: string; question_type: string; label: string; sort_order: number };

const CATEGORY = '프로모션';
const PAGE_LIMIT = 50;

export default function PromotionsListPage() {
  const router = useRouter();
  const { accessToken } = useAdmin();

  const [records, setRecords] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [filterEvent, setFilterEvent] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [events, setEvents] = useState<Event[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // 선택
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 상세 drawer
  const [detail, setDetail] = useState<Registration | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<CustomQuestion[]>([]);

  // 이벤트별 커스텀 문항 캐시 (drawer 클릭 시 즉시 사용)
  const questionsCache = useRef<Map<string, CustomQuestion[]>>(new Map());
  const inflightFetch = useRef<Map<string, Promise<CustomQuestion[]>>>(new Map());

  // 추출
  const [exporting, setExporting] = useState(false);

  // 프로모션 카테고리 이벤트 목록
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setEvents(list.filter((e: Event) => e.category === CATEGORY));
      })
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
        limit: String(PAGE_LIMIT),
        sort: sortKey,
        order: sortAsc ? 'asc' : 'desc',
        category: CATEGORY,
      });
      if (search) params.set('search', search);
      if (filterEvent) params.set('event_id', filterEvent);
      if (filterYear) params.set('year', filterYear);

      const res = await fetch(`/api/admin/registrations?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      const data = await res.json();
      setRecords(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total || 0);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setRecords([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [accessToken, page, sortKey, sortAsc, search, filterEvent, filterYear]);

  useEffect(() => {
    if (accessToken) fetchRecords();
  }, [accessToken, fetchRecords]);

  // 현재 페이지에 등장하는 이벤트들의 커스텀 문항을 미리 로드해서 캐시.
  // → drawer 클릭 시 네트워크 호출 없이 즉시 표시.
  useEffect(() => {
    if (!accessToken || records.length === 0) return;
    const eventIdsOnPage = Array.from(new Set(records.map((r) => r.event_id).filter((id): id is string => !!id)));
    for (const eid of eventIdsOnPage) {
      if (questionsCache.current.has(eid)) continue;
      if (inflightFetch.current.has(eid)) continue;
      const p = fetch(`/api/admin/event-questions?event_id=${eid}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          const list: CustomQuestion[] = Array.isArray(d) ? d : [];
          list.sort((a, b) => a.sort_order - b.sort_order);
          questionsCache.current.set(eid, list);
          return list;
        })
        .catch(() => {
          questionsCache.current.set(eid, []);
          return [];
        })
        .finally(() => {
          inflightFetch.current.delete(eid);
        });
      inflightFetch.current.set(eid, p);
    }
  }, [accessToken, records]);

  // 검색 디바운스
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchDebounce.current);
  }, [searchInput]);

  const openDetail = (record: Registration) => {
    setDetail(record);
    if (!record.event_id) {
      setDetailQuestions([]);
      return;
    }
    // 캐시에 있으면 즉시 사용
    const cached = questionsCache.current.get(record.event_id);
    if (cached) {
      setDetailQuestions(cached);
      return;
    }
    // 캐시 미스 — fetch 진행 중인 게 있으면 기다리고, 없으면 새 요청
    setDetailQuestions([]);
    const eid = record.event_id;
    const inflight = inflightFetch.current.get(eid);
    const p = inflight || fetch(`/api/admin/event-questions?event_id=${eid}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list: CustomQuestion[] = Array.isArray(d) ? d : [];
        list.sort((a, b) => a.sort_order - b.sort_order);
        questionsCache.current.set(eid, list);
        return list;
      })
      .catch(() => [] as CustomQuestion[]);
    p.then((list) => {
      // drawer 가 같은 record 에 머물러 있을 때만 반영 (다른 행으로 옮겼으면 무시)
      setDetail((cur) => {
        if (cur && cur.id === record.id) setDetailQuestions(list);
        return cur;
      });
    });
  };

  // 선택 토글
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (records.length === 0) return;
    const allSelected = records.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const r of records) next.delete(r.id);
      } else {
        for (const r of records) next.add(r.id);
      }
      return next;
    });
  };

  const jumpToRegistrations = (id: string) => {
    router.push(`/admin-cloocus-mkt/registrations?open=${id}`);
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      // 선택된 행이 있으면 선택분만, 아니면 현재 필터 기준 전체
      if (selected.size > 0) {
        params.set('ids', Array.from(selected).join(','));
      } else if (filterEvent) {
        params.set('event_id', filterEvent);
      }
      const res = await fetch(`/api/admin/promotions-export?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '추출에 실패했습니다.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloocus_promotions_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ' ↕';

  // 연도 필터: 현재 연도까지만 노출. 해가 바뀌면 자동으로 새 연도가 추가됨.
  // 과거 연도가 필요해지면 startYear 를 조정.
  const currentYear = new Date().getFullYear();
  const startYear = 2026;
  const yearOptions = Array.from({ length: Math.max(1, currentYear - startYear + 1) }, (_, i) => String(currentYear - i));

  const allOnPageSelected = records.length > 0 && records.every((r) => selected.has(r.id));
  const someOnPageSelected = records.some((r) => selected.has(r.id));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const eventName = (id: string | null) => id ? (events.find((e) => e.id === id)?.name || '-') : '-';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">프로모션 리스트 ({total}건)</h1>
          <p className="text-xs text-gray-500 mt-1">
            프로모션 카테고리 신청자만 모아보고, 추가 문항 응답까지 포함해 추출 가능합니다.
            {selected.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">{selected.size}건 선택됨</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting || total === 0}
            className="text-sm px-3 py-2 rounded-lg font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            {exporting ? '추출 중...' : selected.size > 0 ? `⬇ XLSX 추출 (${selected.size}건)` : '⬇ XLSX 추출 (전체 응답 포함)'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting || total === 0}
            className="text-sm px-3 py-2 rounded-lg font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="이름·회사명·이메일 검색"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select
          value={filterEvent}
          onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">전체 프로모션</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select
          value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">전체 연도</option>
          {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <button
          onClick={() => { setSearchInput(''); setFilterEvent(''); setFilterYear(''); setPage(1); }}
          className="text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          필터 초기화
        </button>
      </div>

      {/* 리스트 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-blue-600"
                    aria-label="현재 페이지 전체 선택"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>성함{sortIcon('name')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('company_name')}>회사명{sortIcon('company_name')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">프로모션</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('email')}>이메일{sortIcon('email')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">연락처</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('created_at')}>등록일{sortIcon('created_at')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-24">상세</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="w-4 h-4 rounded accent-blue-600"
                      aria-label="행 선택"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.company_name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{eventName(r.event_id)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.email}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{page} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-30">이전</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-30">다음</button>
            </div>
          </div>
        )}
      </div>

      {/* 상세 drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetail(null)}>
          <div
            className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">신청 상세</h2>
                <p className="text-xs text-gray-500 mt-0.5">{eventName(detail.event_id)}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-5 space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">기본 정보</h3>
                <dl className="space-y-2 text-sm">
                  <Row label="성함" value={detail.name} />
                  <Row label="회사명" value={detail.company_name} />
                  <Row label="부서" value={detail.department} />
                  <Row label="직급" value={detail.job_title} />
                  <Row label="이메일" value={detail.email} />
                  <Row label="연락처" value={detail.phone} />
                  <Row label="산업군" value={detail.industry} />
                  <Row label="기업 규모" value={detail.company_size} />
                  <Row label="신청 경로" value={detail.referral_source} />
                  {detail.referrer_name && <Row label="추천인" value={detail.referrer_name} />}
                  <Row label="등록 상태" value={
                    detail.registration_status === 'confirmed' ? '확정' :
                    detail.registration_status === 'rejected' ? '불가' : '대기'
                  } />
                  <Row label="등록일" value={new Date(detail.created_at).toLocaleString('ko-KR')} />
                  {detail.cancelled_at && (
                    <Row label="취소일" value={new Date(detail.cancelled_at).toLocaleString('ko-KR')} />
                  )}
                </dl>
              </section>

              {detail.inquiry && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">문의사항</h3>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detail.inquiry}</p>
                </section>
              )}

              {detailQuestions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">✨ 프로모션 추가 문항 응답</h3>
                  <dl className="space-y-3 text-sm">
                    {detailQuestions.map((q) => {
                      const a = (detail.custom_answers || {})[q.id];
                      let display: string;
                      if (Array.isArray(a)) display = a.length > 0 ? a.join(', ') : '(응답 없음)';
                      else if (typeof a === 'boolean') display = a ? '동의함' : '미동의';
                      else if (typeof a === 'string') display = a || '(응답 없음)';
                      else display = '(응답 없음)';
                      return (
                        <div key={q.id} className="border-l-2 border-amber-200 pl-3">
                          <p className="text-xs text-gray-500 mb-0.5">{q.label}</p>
                          <p className="text-gray-900 whitespace-pre-wrap">{display}</p>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
              <button
                onClick={() => jumpToRegistrations(detail.id)}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                등록 리스트에서 편집하기 →
              </button>
              <button
                onClick={() => setDetail(null)}
                className="text-sm px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <dt className="w-24 shrink-0 text-gray-500 text-xs">{label}</dt>
      <dd className="flex-1 text-gray-900">{value || '-'}</dd>
    </div>
  );
}
