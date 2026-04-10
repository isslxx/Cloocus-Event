'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdmin } from './layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { Registration, Event } from '@/lib/types';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d', '#c026d3', '#ea580c', '#0369a1', '#4f46e5', '#84cc16'];

type Metrics = {
  total: number;
  today: number;
  topIndustry: string;
  topSource: string;
  byDay: { date: string; count: number }[];
  byIndustry: { name: string; value: number }[];
  bySource: { name: string; value: number }[];
  byEvent: { name: string; value: number }[];
};

function computeMetrics(records: Registration[], events: Event[]): Metrics {
  const eventMap = new Map(events.map((e) => [e.id, e.name]));
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter((r) => r.created_at.slice(0, 10) === today).length;

  const dayMap: Record<string, number> = {};
  records.forEach((r) => {
    const d = r.created_at.slice(0, 10);
    dayMap[d] = (dayMap[d] || 0) + 1;
  });
  const byDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  const indMap: Record<string, number> = {};
  records.forEach((r) => { indMap[r.industry] = (indMap[r.industry] || 0) + 1; });
  const byIndustry = Object.entries(indMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  const srcMap: Record<string, number> = {};
  records.forEach((r) => { srcMap[r.referral_source] = (srcMap[r.referral_source] || 0) + 1; });
  const bySource = Object.entries(srcMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  const evtMap: Record<string, number> = {};
  records.forEach((r) => {
    const name = r.event_id ? (eventMap.get(r.event_id) || '기타') : '미지정';
    evtMap[name] = (evtMap[name] || 0) + 1;
  });
  const byEvent = Object.entries(evtMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  return {
    total: records.length,
    today: todayCount,
    topIndustry: byIndustry[0]?.name || '-',
    topSource: bySource[0]?.name || '-',
    byDay,
    byIndustry,
    bySource,
    byEvent,
  };
}

export default function AdminDashboard() {
  const { accessToken } = useAdmin();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'png' | 'xlsx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const exportAsImage = async () => {
    if (!dashboardRef.current) return;
    setExporting('png');
    setShowExportMenu(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#f9fafb',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `cloocus_dashboard_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // ignore
    } finally {
      setExporting(null);
    }
  };

  const exportAsExcel = async () => {
    if (!metrics) return;
    setExporting('xlsx');
    setShowExportMenu(false);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // 요약 시트
      const summaryData = [
        { '항목': '총 등록수', '값': metrics.total },
        { '항목': '오늘 등록', '값': metrics.today },
        { '항목': '최다 산업군', '값': metrics.topIndustry },
        { '항목': '최다 신청 경로', '값': metrics.topSource },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws1, '요약');

      // 일별 등록 시트
      const ws2 = XLSX.utils.json_to_sheet(metrics.byDay.map((d) => ({ '날짜': d.date, '등록수': d.count })));
      ws2['!cols'] = [{ wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, '일별 등록');

      // 산업군 시트
      const ws3 = XLSX.utils.json_to_sheet(metrics.byIndustry.map((d) => ({ '산업군': d.name, '등록수': d.value })));
      ws3['!cols'] = [{ wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3, '산업군 분포');

      // 이벤트별 시트
      const ws4 = XLSX.utils.json_to_sheet(metrics.byEvent.map((d) => ({ '이벤트': d.name, '등록수': d.value })));
      ws4['!cols'] = [{ wch: 30 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws4, '이벤트별');

      // 신청 경로 시트
      const ws5 = XLSX.utils.json_to_sheet(metrics.bySource.map((d) => ({ '신청 경로': d.name, '등록수': d.value })));
      ws5['!cols'] = [{ wch: 25 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws5, '신청 경로');

      XLSX.writeFile(wb, `cloocus_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      // ignore
    } finally {
      setExporting(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [regRes, evtRes] = await Promise.all([
        fetch('/api/admin/registrations?limit=10000', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const { data } = await regRes.json();
      const evtData = await evtRes.json();
      setMetrics(computeMetrics(data || [], Array.isArray(evtData) ? evtData : []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchData();
  }, [accessToken, fetchData]);

  if (loading) {
    return <p className="text-gray-400">데이터 로딩 중...</p>;
  }

  if (!metrics) {
    return <p className="text-gray-400">데이터를 불러올 수 없습니다.</p>;
  }

  const cards = [
    { label: '총 등록수', value: metrics.total, color: 'bg-blue-50 text-blue-700' },
    { label: '오늘 등록', value: metrics.today, color: 'bg-green-50 text-green-700' },
    { label: '최다 산업군', value: metrics.topIndustry, color: 'bg-purple-50 text-purple-700' },
    { label: '최다 신청 경로', value: metrics.topSource, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!!exporting}
            className="btn-secondary text-sm"
          >
            {exporting ? '내보내는 중...' : '내보내기 ▾'}
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              <button
                onClick={exportAsImage}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-t-lg"
              >
                📷 이미지 (PNG)
              </button>
              <button
                onClick={exportAsExcel}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
              >
                📊 엑셀 (XLSX)
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={dashboardRef}>
        {/* 메트릭 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-xl p-5 ${c.color}`}>
              <p className="text-xs font-medium opacity-70">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 일별 등록 추이 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">일별 등록 추이</h3>
            {metrics.byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="등록수" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* 산업군 분포 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">산업군 분포</h3>
            {metrics.byIndustry.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metrics.byIndustry}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {metrics.byIndustry.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* 이벤트별 등록수 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">이벤트별 등록수</h3>
            {metrics.byEvent.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.byEvent} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={140} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} name="등록수" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* 신청 경로 분포 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">신청 경로 분포</h3>
            {metrics.bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.bySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={160} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} name="등록수" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
