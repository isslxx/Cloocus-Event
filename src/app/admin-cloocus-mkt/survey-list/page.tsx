'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type SurveyParticipant = {
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
  registration_status: string;
  survey_completed: boolean;
  created_at: string;
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
      '성함': r.name, '회사명': r.company_name, '부서명': r.department, '직급': r.job_title,
      '이메일': r.email, '연락처': r.phone, '산업군': r.industry, '기업 규모': r.company_size,
      '신청 경로': r.referral_source, '추천인': r.referrer_name || '-',
      '등록 상태': r.registration_status === 'confirmed' ? '등록 확정' : r.registration_status === 'rejected' ? '등록 불가' : '등록 대기',
      '설문 완료': r.survey_completed ? 'O' : 'X',
      '등록일': new Date(r.created_at).toLocaleDateString('ko-KR'),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
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
    return r.name.toLowerCase().includes(q) || r.company_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey];
    const vb = (b as Record<string, unknown>)[sortKey];
    const cmp = String(va || '').localeCompare(String(vb || ''));
    return sortAsc ? cmp : -cmp;
  });

  const completedCount = filteredParticipants.filter((r) => r.survey_completed).length;

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
                    {[
                      { key: 'department', label: '부서', align: 'left' },
                      { key: 'job_title', label: '직급', align: 'left' },
                      { key: 'email', label: '이메일', align: 'left' },
                      { key: 'phone', label: '연락처', align: 'left' },
                      { key: 'industry', label: '산업군', align: 'left' },
                      { key: 'registration_status', label: '등록 상태', align: 'left' },
                      { key: 'survey_completed', label: '설문', align: 'center' },
                      { key: 'created_at', label: '등록일', align: 'left' },
                    ].map((col) => (
                      <th key={col.key} className={`px-4 py-3 text-${col.align} font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 bg-gray-50 ${sortKey === col.key ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`} onClick={() => handleSort(col.key)}>
                        {col.label}{sortIcon(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map((r) => (
                    <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className={`px-3 py-3 sticky left-0 z-10 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" /></td>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap sticky left-[40px] z-10 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}>{r.name}</td>
                      <td className={`px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 border-r border-gray-100 ${selected.has(r.id) ? 'bg-blue-50' : 'bg-white'}`}>{r.company_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.department}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.job_title}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.phone}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{r.industry}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.registration_status === 'confirmed' ? 'bg-green-100 text-green-700' : r.registration_status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.registration_status === 'confirmed' ? '확정' : r.registration_status === 'rejected' ? '불가' : '대기'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.survey_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {r.survey_completed ? '완료' : '미완료'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {/* 하단 고정 카운트 바 */}
          <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 rounded-b-xl shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 text-sm text-gray-500">
              총 {participants.length}명{selected.size > 0 && ` (${selected.size}명 선택)`}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
