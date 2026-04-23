'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type SurveyParticipant = {
  id: string;
  event_id: string | null;
  name: string;
  company_name: string;
  company_name_raw?: string | null;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  industry: string;
  company_size: string;
  referral_source: string;
  referrer_name: string;
  inquiry: string | null;
  inquiry_status: string | null;
  registration_status: string;
  survey_enabled: boolean;
  survey_completed: boolean;
  email_status: string | null;
  certificate_issued?: boolean;
  certificate_issued_at?: string | null;
  created_at: string;
  // 설문 응답
  q1_azure_level: string | null;
  q2_difficulty: string | null;
  q3_purpose: string[] | null;
  q4_adoption: string | null;
  q5_consulting: string[] | null;
  q6_feedback: string | null;
  survey_feedback: string | null;
  survey_submitted_at: string | null;
};

export default function SurveyListPage() {
  const { accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [participants, setParticipants] = useState<SurveyParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const fetchParticipants = useCallback(async (eventId: string) => {
    if (!eventId) { setParticipants([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/survey-list?event_id=${eventId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    setSelected(new Set());
    fetchParticipants(eventId);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selected.size === participants.length) setSelected(new Set());
    else setSelected(new Set(participants.map((r) => r.id)));
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const exportData = (selected.size > 0 ? participants.filter((r) => selected.has(r.id)) : participants).map((r) => ({
      '성함': r.name,
      '회사명': r.company_name_raw || r.company_name,
      '부서명': r.department,
      '직급': r.job_title,
      '이메일': r.email,
      '연락처': r.phone,
      '산업군': r.industry,
      '기업 규모': r.company_size,
      '신청 경로': r.referral_source,
      '추천인': r.referrer_name || '-',
      '설문 완료': r.survey_completed ? 'O' : 'X',
      'Q1. Azure 이해 수준': r.q1_azure_level || '',
      'Q2. 난이도': r.q2_difficulty || '',
      'Q3. 참여 목적': Array.isArray(r.q3_purpose) ? r.q3_purpose.join(', ') : (r.q3_purpose || ''),
      'Q4. 도입 계획': r.q4_adoption || '',
      'Q5. 상담 희망': Array.isArray(r.q5_consulting) ? r.q5_consulting.join(', ') : (r.q5_consulting || ''),
      'Q6. 피드백': r.q6_feedback || '',
      '설문 완료일': r.survey_submitted_at ? new Date(r.survey_submitted_at).toLocaleString('ko-KR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = Array(Object.keys(exportData[0] || {}).length).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, ws, '설문 리스트');
    const evtName = events.find((e) => e.id === selectedEvent)?.name || '전체';
    XLSX.writeFile(wb, `설문리스트_${evtName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };
  const sortIcon = (key: string) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ' ↕';

  const filteredParticipants = participants.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.company_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
  });
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey];
    const vb = (b as Record<string, unknown>)[sortKey];
    const cmp = String(va || '').localeCompare(String(vb || ''));
    return sortAsc ? cmp : -cmp;
  });

  const completedCount = filteredParticipants.filter((r) => r.survey_completed).length;

  const formatArr = (v: unknown): string => Array.isArray(v) ? v.join(', ') : (v ? String(v) : '');

  // 정렬 가능한 일반 컬럼
  const middleCols: { key: string; label: string }[] = [
    { key: 'department', label: '부서명' },
    { key: 'job_title', label: '직급' },
    { key: 'email', label: '이메일' },
    { key: 'phone', label: '연락처' },
    { key: 'industry', label: '산업군' },
    { key: 'company_size', label: '기업 규모' },
    { key: 'referral_source', label: '신청 경로' },
    { key: 'referrer_name', label: '추천인' },
    { key: 'survey_completed', label: '설문' },
    { key: 'q1_azure_level', label: 'Q1. Azure 이해 수준' },
    { key: 'q2_difficulty', label: 'Q2. 난이도' },
    { key: 'q3_purpose', label: 'Q3. 참여 목적' },
    { key: 'q4_adoption', label: 'Q4. 도입 계획' },
    { key: 'q5_consulting', label: 'Q5. 상담 희망' },
    { key: 'q6_feedback', label: 'Q6. 피드백' },
    { key: 'survey_submitted_at', label: '설문 완료일' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">설문 리스트 관리</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedEvent} onChange={(e) => handleEventChange(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">이벤트 선택</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          {selected.size > 0 && (
            <button
              onClick={async () => {
                if (!confirm(`선택한 ${selected.size}건을 삭제하시겠습니까?\n삭제된 항목은 휴지통에서 3일간 보관됩니다.`)) return;
                const ids = Array.from(selected);
                await Promise.all(ids.map((id) =>
                  fetch('/api/admin/registrations', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ id }),
                  }).catch(() => {})
                ));
                setSelected(new Set());
                fetchParticipants(selectedEvent);
              }}
              className="btn-danger text-sm"
            >
              삭제 ({selected.size})
            </button>
          )}
          {participants.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-sm">
              XLSX 추출{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          )}
        </div>
      </div>

      {!selectedEvent ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          이벤트를 선택해주세요.
        </div>
      ) : loading ? (
        <p className="text-gray-400">로딩 중...</p>
      ) : participants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          설문 대상자가 없습니다.
        </div>
      ) : (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 text-blue-700 rounded-xl p-4">
              <p className="text-xs font-medium opacity-70">설문 대상</p>
              <p className="text-2xl font-bold mt-1">{filteredParticipants.length}명</p>
            </div>
            <div className="bg-green-50 text-green-700 rounded-xl p-4">
              <p className="text-xs font-medium opacity-70">설문 완료</p>
              <p className="text-2xl font-bold mt-1">{completedCount}명</p>
            </div>
            <div className="bg-amber-50 text-amber-700 rounded-xl p-4">
              <p className="text-xs font-medium opacity-70">미완료</p>
              <p className="text-2xl font-bold mt-1">{filteredParticipants.length - completedCount}명</p>
            </div>
          </div>

          {/* 검색 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <input
              type="text"
              placeholder="이름, 회사, 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: '400px' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 w-10 bg-gray-50 sticky left-0 z-30">
                    <input type="checkbox" checked={participants.length > 0 && selected.size === participants.length} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-blue-600" />
                  </th>
                  <th className={`px-4 py-3 text-left font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 bg-gray-50 sticky left-[40px] z-30 ${sortKey === 'name' ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`} onClick={() => handleSort('name')}>
                    성함{sortIcon('name')}
                  </th>
                  <th className={`px-4 py-3 text-left font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 bg-gray-50 sticky left-[120px] z-30 border-r border-gray-200 ${sortKey === 'company_name' ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`} onClick={() => handleSort('company_name')}>
                    회사명{sortIcon('company_name')}
                  </th>
                  {middleCols.map((col) => (
                    <th key={col.key} className={`px-4 py-3 text-left font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 bg-gray-50 ${sortKey === col.key ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`} onClick={() => handleSort(col.key)}>
                      {col.label}{sortIcon(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((r) => (
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className={`px-3 py-3 w-10 sticky left-0 z-10 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" />
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-medium sticky left-[40px] z-10 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}>{r.name}</td>
                    <td className={`px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 border-r border-gray-100 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}>{r.company_name_raw || r.company_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.department || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.job_title || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.industry || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.company_size || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.referral_source || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.referrer_name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.survey_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {r.survey_completed ? '완료' : '미완료'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={r.q1_azure_level || ''}>{r.q1_azure_level || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.q2_difficulty || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={formatArr(r.q3_purpose)}>{formatArr(r.q3_purpose) || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={r.q4_adoption || ''}>{r.q4_adoption || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={formatArr(r.q5_consulting)}>{formatArr(r.q5_consulting) || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate" title={r.q6_feedback || ''}>{r.q6_feedback || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {r.survey_submitted_at ? new Date(r.survey_submitted_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 하단 고정 카운트 바 */}
          <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-20 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-4 lg:px-8 py-3">
              <p className="text-sm text-gray-500">
                총 {filteredParticipants.length}명 / 완료 {completedCount}명 / 미완료 {filteredParticipants.length - completedCount}명
                {selected.size > 0 && ` · ${selected.size}명 선택`}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
