'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

function countValues(arr: string[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const v of arr) { map[v] = (map[v] || 0) + 1; }
  return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
}

function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-gray-600 w-[180px] shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">{count}명 ({pct}%)</span>
    </div>
  );
}

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
      '성함': r.name, '회사명': r.company_name, '이메일': r.email, '연락처': r.phone,
      'Q1. Azure 이해 수준': r.q1_azure_level, 'Q2. 난이도': r.q2_difficulty,
      'Q3. 참여 목적': (r.q3_purpose || []).join(', '), 'Q4. Azure 도입 계획': r.q4_adoption,
      'Q5. 컨설팅 필요': (r.q5_consulting || []).join(', '), 'Q6. 피드백': r.q6_feedback,
      '제출일': new Date(r.created_at).toLocaleDateString('ko-KR'),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, '설문 응답');
    const evtName = events.find((e) => e.id === selectedEvent)?.name || '전체';
    XLSX.writeFile(wb, `설문응답_${evtName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 통계 계산
  const stats = useMemo(() => {
    if (responses.length === 0) return null;
    const total = responses.length;
    return {
      total,
      q1: countValues(responses.map((r) => r.q1_azure_level).filter(Boolean)),
      q2: countValues(responses.map((r) => r.q2_difficulty).filter(Boolean)),
      q3: countValues(responses.flatMap((r) => r.q3_purpose || [])),
      q4: countValues(responses.map((r) => r.q4_adoption).filter(Boolean)),
      q5: countValues(responses.flatMap((r) => r.q5_consulting || [])),
      feedbackCount: responses.filter((r) => r.q6_feedback?.trim()).length,
    };
  }, [responses]);

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">설문조사 응답</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedEvent} onChange={(e) => handleEventChange(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
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
        <>
          {/* 통계 대시보드 */}
          {stats && (
            <div className="mb-6">
              {/* 요약 카드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 text-blue-700 rounded-xl p-4">
                  <p className="text-xs font-medium opacity-70">총 응답</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}건</p>
                </div>
                <div className="bg-green-50 text-green-700 rounded-xl p-4">
                  <p className="text-xs font-medium opacity-70">피드백 작성</p>
                  <p className="text-2xl font-bold mt-1">{stats.feedbackCount}건</p>
                </div>
                <div className="bg-purple-50 text-purple-700 rounded-xl p-4">
                  <p className="text-xs font-medium opacity-70">최다 Azure 수준</p>
                  <p className="text-lg font-bold mt-1 truncate">{stats.q1[0]?.name.split('(')[0]?.trim() || '-'}</p>
                </div>
                <div className="bg-amber-50 text-amber-700 rounded-xl p-4">
                  <p className="text-xs font-medium opacity-70">최다 난이도</p>
                  <p className="text-lg font-bold mt-1">{stats.q2[0]?.name || '-'}</p>
                </div>
              </div>

              {/* 차트 영역 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q1. Azure 이해 수준</h3>
                  <div className="space-y-1">
                    {stats.q1.map((d, i) => <StatBar key={d.name} label={d.name.split('(')[0]?.trim()} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q2. 난이도</h3>
                  <div className="space-y-1">
                    {stats.q2.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q3. 참여 목적 (복수)</h3>
                  <div className="space-y-1">
                    {stats.q3.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q4. Azure 도입 계획</h3>
                  <div className="space-y-1">
                    {stats.q4.map((d, i) => <StatBar key={d.name} label={d.name.split('(')[0]?.trim()} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q5. 컨설팅 필요 (복수)</h3>
                  <div className="space-y-1">
                    {stats.q5.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q6. 피드백 요약</h3>
                  <p className="text-sm text-gray-500">{stats.feedbackCount}명이 피드백을 작성했습니다.</p>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                    {responses.filter((r) => r.q6_feedback?.trim()).slice(0, 10).map((r) => (
                      <div key={r.id} className="text-xs bg-gray-50 rounded p-2">
                        <span className="font-medium text-gray-700">{r.name}</span>
                        <span className="text-gray-400 ml-1">({r.company_name})</span>
                        <p className="text-gray-600 mt-0.5">{r.q6_feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 응답 테이블 */}
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
                      <td className="px-3 py-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" /></td>
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
        </>
      )}
    </div>
  );
}
