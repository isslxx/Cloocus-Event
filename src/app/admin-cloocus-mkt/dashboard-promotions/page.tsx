'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdmin } from '../layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import type { Event } from '@/lib/types';

// 프로모션 전용 대시보드 — 통합 대시보드 API 의 category 필터를 활용해 프로모션 카테고리만 집계.
// 통합 대시보드와 동일한 디멘션을 쓰되 핵심 차트만 노출.

type CountEntry = { name: string; value: number };
type DayEntry = { date: string; count: number };

type DashData = {
  filter: string;
  range: { start: string | null; end: string | null; days: number | null };
  kpi: {
    total: number;
    today: number;
    yesterdayCount: number;
    todayDeltaPct: number;
    topSource: string;
    topReferrer: { name: string; value: number };
    surveyCompletionRate: number;
    certificateRate: number;
  };
  funnel: { registered: number; surveyCompleted: number; certificateIssued: number };
  byDay: DayEntry[];
  bySource: CountEntry[];
  byEvent: { name: string; total: number; surveyCompleted: number; certificateIssued: number; surveyRate: number }[];
  byUtm: { bySource: CountEntry[]; byMedium: CountEntry[]; byCampaign: CountEntry[]; byId: CountEntry[] };
  visitUtm: {
    totalVisits: number;
    uniqueSessions: number;
    bySource: CountEntry[];
    byMedium: CountEntry[];
    byCampaign: CountEntry[];
    byId: CountEntry[];
  };
};

const CATEGORY = '프로모션';

export default function PromotionsDashboard() {
  const { accessToken } = useAdmin();
  const [data, setData] = useState<DashData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [range, setRange] = useState<'7' | '14' | '30' | 'all'>('30');
  const [utmTab, setUtmTab] = useState<'source' | 'medium' | 'campaign' | 'id'>('source');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        range,
        category: CATEGORY,
      });
      const res = await fetch(`/api/admin/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, range]);

  useEffect(() => {
    if (!accessToken) return;
    fetchDashboard();
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setEvents(list.filter((e: Event) => e.category === CATEGORY));
      })
      .catch(() => {});
  }, [accessToken, fetchDashboard]);

  const utmKey = utmTab === 'source' ? 'bySource' : utmTab === 'medium' ? 'byMedium' : utmTab === 'campaign' ? 'byCampaign' : 'byId';
  const utmEntries = useMemo(() => (data ? data.byUtm[utmKey] : []), [data, utmKey]);
  const visitUtmEntries = useMemo(() => (data ? data.visitUtm[utmKey] : []), [data, utmKey]);

  if (loading) {
    return <div className="text-gray-400 text-sm">로딩 중...</div>;
  }

  if (!data) {
    return <div className="text-gray-400 text-sm">데이터를 불러올 수 없습니다.</div>;
  }

  const isEmpty = data.kpi.total === 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">프로모션 대시보드</h1>
          <p className="text-xs text-gray-500 mt-1">프로모션 카테고리에 한정한 신청·전환·UTM 집계입니다.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="all">전체 프로모션</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-xs bg-white">
            {(['7', '14', '30', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 ${range === r ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
              >
                {r === 'all' ? '전체' : `${r}일`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="총 신청" value={data.kpi.total} />
        <Kpi label="오늘" value={data.kpi.today} delta={data.kpi.todayDeltaPct} />
        <Kpi label="총 방문 (세션)" value={data.visitUtm.uniqueSessions} sub={`${data.visitUtm.totalVisits} 페이지뷰`} />
        <Kpi
          label="등록 전환율"
          value={`${data.visitUtm.uniqueSessions > 0 ? ((data.kpi.total / data.visitUtm.uniqueSessions) * 100).toFixed(1) : '0'}%`}
          sub="등록/세션"
        />
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          <p className="text-sm">선택한 기간에 프로모션 신청 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 일별 신청 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold mb-3">일별 신청 추이</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={2} dot={false} name="신청" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 프로모션별 신청 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold mb-3">프로모션별 신청 수</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, data.byEvent.length * 36 + 40)}>
              <BarChart data={data.byEvent} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={11} width={180} />
                <Tooltip />
                <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} name="신청 수" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* UTM 디멘션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">등록 기준 UTM</h3>
                <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-xs">
                  {(['source', 'medium', 'campaign', 'id'] as const).map((t) => (
                    <button key={t} onClick={() => setUtmTab(t)} className={`px-2.5 py-1 ${utmTab === t ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">UTM 없이 등록한 사용자는 (direct) 로 묶임</p>
              {utmEntries.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={utmEntries} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} name="등록수" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">데이터 없음</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold mb-1">방문 기준 UTM</h3>
              <p className="text-xs text-gray-500 mb-3">page_events 기반 — 위 탭 ({utmTab}) 동기화</p>
              {visitUtmEntries.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={visitUtmEntries} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} name="방문수" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">데이터 없음</p>
              )}
            </div>
          </div>

          {/* 등록 vs 방문 (전환) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold mb-3">전환율 ({utmTab} 기준)</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left border border-gray-200">{utmTab}</th>
                  <th className="px-3 py-2 text-right border border-gray-200">방문 (세션)</th>
                  <th className="px-3 py-2 text-right border border-gray-200">등록</th>
                  <th className="px-3 py-2 text-right border border-gray-200">전환율</th>
                </tr>
              </thead>
              <tbody>
                {visitUtmEntries.map((d) => {
                  const reg = utmEntries.find((r) => r.name === d.name)?.value || 0;
                  const conv = d.value > 0 ? (reg / d.value) * 100 : 0;
                  return (
                    <tr key={d.name}>
                      <td className="px-3 py-1.5 border border-gray-200">{d.name}</td>
                      <td className="px-3 py-1.5 text-right border border-gray-200">{d.value}</td>
                      <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{reg}</td>
                      <td className={`px-3 py-1.5 text-right border border-gray-200 ${conv > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                        {conv.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {visitUtmEntries.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">데이터 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, delta, sub }: { label: string; value: string | number; delta?: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {typeof delta === 'number' && (
        <p className={`text-xs mt-1 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'} {Math.abs(delta).toFixed(0)}% (전일 대비)
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
