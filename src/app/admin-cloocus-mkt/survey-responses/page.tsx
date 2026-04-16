'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type SurveyResponse = {
  id: string;
  registration_id: string;
  q1_azure_level: string;
  q2_difficulty: string;
  q3_purpose: string[];
  q4_adoption: string;
  q5_consulting: string[];
  q6_feedback: string;
  created_at: string;
  name: string;
  company_name: string;
  email: string;
  phone: string;
};

export default function SurveyResponsesPage() {
  const { accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const fetchResponses = useCallback(async (eventId: string) => {
    if (!eventId) { setResponses([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/survey-responses?event_id=${eventId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setResponses(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    setSelected(new Set());
    fetchResponses(eventId);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selected.size === responses.length) setSelected(new Set());
    else setSelected(new Set(responses.map((r) => r.id)));
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const exportData = (selected.size > 0 ? responses.filter((r) => selected.has(r.id)) : responses).map((r) => ({
      '성함': r.name,
      '회사명': r.company_name,
      '이메일': r.email,
      '연락처': r.phone,
      'Q1. Azure 이해 수준': r.q1_azure_level,
      'Q2. 난이도': r.q2_difficulty,
      'Q3. 참여 목적': (r.q3_purpose || []).join(', '),
      'Q4. Azure 도입 계획': r.q4_adoption,
      'Q5. 컨설팅 필요': (r.q5_consulting || []).join(', '),
      'Q6. 피드백': r.q6_feedback,
      '제출일': new Date(r.created_at).toLocaleDateString('ko-KR'),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, '설문 응답');
    const evtName = events.find((e) => e.id === selectedEvent)?.name || '전체';
    XLSX.writeFile(wb, `설문응답_${evtName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">설문조사 응답</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedEvent}
            onChange={(e) => handleEventChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">이벤트 선택</option>
            {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
          </select>
          {responses.length > 0 && (
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
      ) : responses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          설문 응답이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={responses.length > 0 && selected.size === responses.length} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-blue-600" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">성함</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">회사명</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q1. Azure 수준</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q2. 난이도</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q3. 참여 목적</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q4. 도입 계획</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q5. 컨설팅</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q6. 피드백</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">제출일</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" />
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                    <td className="px-4 py-3 text-xs">{r.q1_azure_level?.split('(')[0]?.trim()}</td>
                    <td className="px-4 py-3 text-xs">{r.q2_difficulty}</td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate">{(r.q3_purpose || []).join(', ')}</td>
                    <td className="px-4 py-3 text-xs max-w-[120px] truncate">{r.q4_adoption?.split('(')[0]?.trim()}</td>
                    <td className="px-4 py-3 text-xs max-w-[120px] truncate">{(r.q5_consulting || []).join(', ')}</td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate text-gray-500">{r.q6_feedback || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            총 {responses.length}건{selected.size > 0 && ` (${selected.size}건 선택)`}
          </div>
        </div>
      )}
    </div>
  );
}
