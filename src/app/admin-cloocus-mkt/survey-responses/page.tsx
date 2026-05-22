'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdmin } from '../layout';
import { formatKST } from '@/lib/date';
import type { Event } from '@/lib/types';

type SurveyAnswer = {
  question_id: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'text';
  value: string | string[];
};

type SurveyResponse = {
  id: string;
  registration_id: string;
  q1_azure_level: string;
  q2_difficulty: string;
  q3_purpose: string[];
  q4_adoption: string;
  q5_consulting: string[];
  q6_feedback: string;
  // 동적 설문 응답(answers JSONB). Azure 기본 6문항 외에 admin 이 편집한 문항이 여기 들어온다.
  answers?: SurveyAnswer[];
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

function StatBar({ label, count, total, color, splitParen = true }: { label: string; count: number; total: number; color: string; splitParen?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  // 라벨이 "본문 (부가설명)" 형태면 두 줄로 분리해 부가설명까지 보이게 함
  // splitParen=false 면 한 줄 그대로 노출 (짧은 옵션이 본문/부가로 갈리면 오히려 가독성↓)
  const parenMatch = splitParen ? label.match(/^([^(]+)\s*\((.+)\)\s*$/) : null;
  const main = parenMatch ? parenMatch[1].trim() : label;
  const sub = parenMatch ? parenMatch[2].trim() : '';
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-[180px] shrink-0 leading-tight" title={label}>
        <p className="text-xs text-gray-700 truncate">{main}</p>
        {sub && <p className="text-[10px] text-gray-400 truncate">({sub})</p>}
      </div>
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
  const [surveyTargetCount, setSurveyTargetCount] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const fetchResponses = useCallback(async (eventId: string) => {
    if (!eventId) { setResponses([]); setSurveyTargetCount(0); return; }
    setLoading(true);
    try {
      const [respRes, listRes] = await Promise.all([
        fetch(`/api/admin/survey-responses?event_id=${eventId}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`/api/admin/survey-list?event_id=${eventId}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const data = await respRes.json();
      const listData = await listRes.json();
      setResponses(Array.isArray(data) ? data : []);
      setSurveyTargetCount(Array.isArray(listData) ? listData.length : 0);
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
    const rows = selected.size > 0 ? responses.filter((r) => selected.has(r.id)) : responses;
    // 동적 설문은 응답마다 문항 수/내용이 다를 수 있으니 컬럼을 합치지 않고
    // 합산된 모든 question_text 를 컬럼으로 만든다.
    const useDynamic = !rows.some((r) => r.q1_azure_level || r.q2_difficulty || (r.q3_purpose?.length ?? 0) > 0);

    let exportData: Record<string, string>[];
    if (useDynamic) {
      // 컬럼 순서: 첫 응답의 question 순서를 기준으로
      const colOrder: string[] = [];
      for (const r of rows) {
        for (const a of (r.answers || [])) {
          if (!colOrder.includes(a.question_text)) colOrder.push(a.question_text);
        }
      }
      exportData = rows.map((r) => {
        const row: Record<string, string> = { '성함': r.name, '회사명': r.company_name, '이메일': r.email, '연락처': r.phone };
        const byText = new Map((r.answers || []).map((a) => [a.question_text, a]));
        for (const col of colOrder) {
          const a = byText.get(col);
          row[col] = a ? (Array.isArray(a.value) ? a.value.join(', ') : a.value) : '';
        }
        row['제출일시 (KST)'] = formatKST(r.created_at, { withSeconds: true });
        return row;
      });
    } else {
      exportData = rows.map((r) => ({
        '성함': r.name, '회사명': r.company_name, '이메일': r.email, '연락처': r.phone,
        'Q1. Azure 이해 수준': r.q1_azure_level, 'Q2. 난이도': r.q2_difficulty,
        'Q3. 참여 목적': (r.q3_purpose || []).join(', '), 'Q4. Azure 도입 계획': r.q4_adoption,
        'Q5. 컨설팅 희망 여부': (r.q5_consulting || []).join(', '), 'Q6. 피드백': r.q6_feedback,
        '제출일시 (KST)': formatKST(r.created_at, { withSeconds: true }),
      }));
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const colKeys = Object.keys(exportData[0] || {});
    ws['!cols'] = colKeys.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, '설문 응답');
    const evtName = events.find((e) => e.id === selectedEvent)?.name || '전체';
    XLSX.writeFile(wb, `설문응답_${evtName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 통계 계산 (legacy Azure 6문항 — q1~q6 컬럼이 있을 때만 의미 있음)
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

  // 응답에 legacy q1~q6 컬럼이 채워져 있는지 — Azure 기본 6문항(또는 dual-write 된 것)인지 판단.
  // legacy 가 있는 경우 기존 Azure-specific 차트가 의미 있고, 없는 경우엔 동적 차트로 대체한다.
  const hasLegacyData = useMemo(
    () => responses.some((r) => r.q1_azure_level || r.q2_difficulty || (r.q3_purpose?.length ?? 0) > 0),
    [responses],
  );

  // 동적 응답 집계 — question_id 별로 그룹핑하여 옵션 응답 카운트 + 텍스트 응답 추출.
  // 새 admin 설문 폼 편집을 통해 만들어진 맞춤 설문(예: Copilot Hands-on Labs)을 렌더링한다.
  const dynamicStats = useMemo(() => {
    const groups = new Map<string, {
      question_id: string;
      question_text: string;
      question_type: 'single' | 'multiple' | 'text';
      counts: Record<string, number>;
      texts: { name: string; company: string; text: string }[];
      totalForQuestion: number;
    }>();
    for (const r of responses) {
      for (const a of (r.answers || [])) {
        let g = groups.get(a.question_id);
        if (!g) {
          g = {
            question_id: a.question_id,
            question_text: a.question_text,
            question_type: a.question_type,
            counts: {},
            texts: [],
            totalForQuestion: 0,
          };
          groups.set(a.question_id, g);
        }
        if (a.question_type === 'text') {
          if (typeof a.value === 'string' && a.value.trim()) {
            g.texts.push({ name: r.name, company: r.company_name, text: a.value });
            g.totalForQuestion += 1;
          }
        } else if (a.question_type === 'multiple') {
          const arr = Array.isArray(a.value) ? a.value : [];
          if (arr.length > 0) g.totalForQuestion += 1;
          for (const v of arr) { g.counts[v] = (g.counts[v] || 0) + 1; }
        } else {
          if (typeof a.value === 'string' && a.value.trim()) {
            g.counts[a.value] = (g.counts[a.value] || 0) + 1;
            g.totalForQuestion += 1;
          }
        }
      }
    }
    return Array.from(groups.values());
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
          {/* 요약 카드 (legacy/dynamic 공통) */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 text-gray-700 rounded-xl p-4">
                <p className="text-xs font-medium opacity-70">설문 대상</p>
                <p className="text-2xl font-bold mt-1">{surveyTargetCount}명</p>
              </div>
              <div className="bg-blue-50 text-blue-700 rounded-xl p-4">
                <p className="text-xs font-medium opacity-70">응답 완료</p>
                <p className="text-2xl font-bold mt-1">{stats.total}건</p>
                {surveyTargetCount > 0 && <p className="text-xs mt-1 opacity-70">{Math.round((stats.total / surveyTargetCount) * 100)}%</p>}
              </div>
              <div className="bg-green-50 text-green-700 rounded-xl p-4">
                <p className="text-xs font-medium opacity-70">피드백 작성</p>
                <p className="text-2xl font-bold mt-1">{stats.feedbackCount}건</p>
              </div>
            </div>
          )}

          {/* Azure 기본 6문항 차트 — legacy q1~q6 컬럼이 있는 경우에만 노출 */}
          {stats && hasLegacyData && (
            <div className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q1. Azure 이해 수준</h3>
                  <div className="space-y-1">
                    {stats.q1.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q2. 난이도</h3>
                  <div className="space-y-1">
                    {stats.q2.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q3. 참여 목적 (복수 응답 가능)</h3>
                  <div className="space-y-1">
                    {stats.q3.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q4. Azure 도입 계획</h3>
                  <div className="space-y-1">
                    {stats.q4.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} />)}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-sm mb-3">Q5. 컨설팅 희망 여부 (복수 응답 가능)</h3>
                  <div className="space-y-1">
                    {stats.q5.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={stats.total} color={colors[i % colors.length]} splitParen={false} />)}
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

          {/* 동적 차트 — admin 페이지 관리>설문 폼에서 편집한 문항이 있을 때 노출 */}
          {!hasLegacyData && dynamicStats.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-3">
                ※ 이 이벤트는 맞춤 설문을 사용 중입니다 — 페이지 관리 &gt; 설문 폼에서 편집된 문항에 대한 응답
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dynamicStats.map((g, qi) => {
                  if (g.question_type === 'text') {
                    return (
                      <div key={g.question_id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="font-semibold text-sm mb-3">{qi + 1}. {g.question_text}</h3>
                        <p className="text-sm text-gray-500">{g.totalForQuestion}명이 응답했습니다.</p>
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                          {g.texts.slice(0, 10).map((t, i) => (
                            <div key={i} className="text-xs bg-gray-50 rounded p-2">
                              <span className="font-medium text-gray-700">{t.name}</span>
                              <span className="text-gray-400 ml-1">({t.company})</span>
                              <p className="text-gray-600 mt-0.5">{t.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  const counts = Object.entries(g.counts).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
                  const totalForBars = g.question_type === 'multiple' ? g.totalForQuestion : counts.reduce((s, x) => s + x.count, 0);
                  return (
                    <div key={g.question_id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-sm mb-3">{qi + 1}. {g.question_text}{g.question_type === 'multiple' && <span className="text-xs text-gray-400 font-normal"> (복수 응답)</span>}</h3>
                      <div className="space-y-1">
                        {counts.map((d, i) => <StatBar key={d.name} label={d.name} count={d.count} total={totalForBars || 1} color={colors[i % colors.length]} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 응답 테이블 — legacy(Azure 6문항)면 기존 컬럼, 동적 설문이면 응답 요약 컬럼 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              {hasLegacyData ? (
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
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q5. 컨설팅 희망 여부</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Q6. 피드백</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">제출일시 (KST)</th>
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
                        <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={r.q4_adoption || ''}>{r.q4_adoption}</td>
                        <td className="px-4 py-3 text-xs max-w-[120px] truncate">{(r.q5_consulting || []).join(', ')}</td>
                        <td className="px-4 py-3 text-xs max-w-[150px] truncate text-gray-500">{r.q6_feedback || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono tabular-nums" title={formatKST(r.created_at, { withSeconds: true })}>{formatKST(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 w-10">
                        <input type="checkbox" checked={responses.length > 0 && selected.size === responses.length} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-blue-600" />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">성함</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">회사명</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">응답 요약</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">제출일시 (KST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r) => (
                      <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-3 py-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-blue-600" /></td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{r.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div className="space-y-1 max-w-[640px]">
                            {(r.answers || []).map((a, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-gray-400 shrink-0">{i + 1}.</span>
                                <span className="text-gray-500 shrink-0 max-w-[200px] truncate" title={a.question_text}>{a.question_text}</span>
                                <span className="text-gray-700 font-medium truncate">— {Array.isArray(a.value) ? a.value.join(', ') : a.value}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono tabular-nums" title={formatKST(r.created_at, { withSeconds: true })}>{formatKST(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
