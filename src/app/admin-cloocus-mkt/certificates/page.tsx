'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type CertRecord = {
  id: string;
  name: string;
  company_name: string;
  email: string;
  event_id: string;
  registration_status: string;
  survey_completed: boolean;
  certificate_issued: boolean;
  certificate_issued_at: string | null;
};

export default function CertificatesPage() {
  const { accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [records, setRecords] = useState<CertRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const fetchRecords = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const param = eventId ? `?event_id=${eventId}` : '';
      const res = await fetch(`/api/admin/certificate-stats${param}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchRecords(selectedEvent);
  }, [accessToken, selectedEvent, fetchRecords]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };
  const sortIcon = (key: string) => sortKey !== key ? '' : sortAsc ? ' ↑' : ' ↓';

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const q = searchTerm.toLowerCase();
    return records.filter((r) =>
      r.name.toLowerCase().includes(q) || r.company_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortKey];
      const vb = (b as Record<string, unknown>)[sortKey];
      const cmp = String(va || '').localeCompare(String(vb || ''));
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredRecords, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const issued = filteredRecords.filter((r) => r.certificate_issued).length;
    const surveyDone = filteredRecords.filter((r) => r.survey_completed).length;
    return { total, issued, surveyDone };
  }, [filteredRecords]);

  // 이벤트별 통계
  const eventStats = useMemo(() => {
    if (selectedEvent) return [];
    const map: Record<string, { name: string; confirmed: number; issued: number }> = {};
    for (const r of records) {
      if (!r.event_id) continue;
      if (!map[r.event_id]) {
        const evt = events.find((e) => e.id === r.event_id);
        map[r.event_id] = { name: evt?.name || '미지정', confirmed: 0, issued: 0 };
      }
      map[r.event_id].confirmed++;
      if (r.certificate_issued) map[r.event_id].issued++;
    }
    return Object.entries(map).sort(([, a], [, b]) => b.confirmed - a.confirmed).map(([id, v]) => ({ id, ...v }));
  }, [records, events, selectedEvent]);

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const data = records.map((r) => ({
      '성함': r.name,
      '회사명': r.company_name,
      '이메일': r.email,
      '이벤트': events.find((e) => e.id === r.event_id)?.name || '-',
      '설문 완료': r.survey_completed ? 'O' : 'X',
      '수료증 발급': r.certificate_issued ? 'O' : 'X',
      '발급일': r.certificate_issued_at ? new Date(r.certificate_issued_at).toLocaleDateString('ko-KR') : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, '수료증 현황');
    XLSX.writeFile(wb, `수료증현황_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">수료증 관리</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">전체 이벤트</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          {records.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-sm">XLSX 추출</button>
          )}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 text-blue-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">등록 확정자</p>
          <p className="text-2xl font-bold mt-1">{stats.total}명</p>
        </div>
        <div className="bg-green-50 text-green-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">수료증 발급</p>
          <p className="text-2xl font-bold mt-1">{stats.issued}명</p>
          {stats.total > 0 && <p className="text-xs mt-1 opacity-70">{Math.round((stats.issued / stats.total) * 100)}%</p>}
        </div>
        <div className="bg-purple-50 text-purple-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">설문 완료</p>
          <p className="text-2xl font-bold mt-1">{stats.surveyDone}명</p>
          {stats.total > 0 && <p className="text-xs mt-1 opacity-70">{Math.round((stats.surveyDone / stats.total) * 100)}%</p>}
        </div>
      </div>

      {/* 이벤트별 요약 (전체 선택 시) */}
      {!selectedEvent && eventStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold mb-3">이벤트별 발급 현황</h2>
          <div className="space-y-2">
            {eventStats.map((e) => {
              const pct = e.confirmed > 0 ? Math.round((e.issued / e.confirmed) * 100) : 0;
              return (
                <div key={e.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2" onClick={() => setSelectedEvent(e.id)}>
                  <span className="text-sm font-medium text-gray-800 w-[200px] truncate">{e.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-24 text-right shrink-0">{e.issued}/{e.confirmed}명 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* 상세 리스트 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>성함{sortIcon('name')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('company_name')}>회사명{sortIcon('company_name')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>이메일{sortIcon('email')}</th>
                {!selectedEvent && <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('event_id')}>이벤트{sortIcon('event_id')}</th>}
                <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('survey_completed')}>설문{sortIcon('survey_completed')}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('certificate_issued')}>수료증{sortIcon('certificate_issued')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('certificate_issued_at')}>발급일{sortIcon('certificate_issued_at')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">등록 확정자가 없습니다.</td></tr>
              ) : sortedRecords.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.email}</td>
                  {!selectedEvent && <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{events.find((e) => e.id === r.event_id)?.name || '-'}</td>}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.survey_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {r.survey_completed ? '완료' : '미완료'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.certificate_issued ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {r.certificate_issued ? '발급' : '미발급'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {r.certificate_issued_at ? new Date(r.certificate_issued_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            총 {filteredRecords.length}명
          </div>
        )}
      </div>
    </div>
  );
}
