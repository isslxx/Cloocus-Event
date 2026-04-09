'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from './layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { Registration } from '@/lib/types';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d', '#c026d3', '#ea580c', '#0369a1', '#4f46e5', '#84cc16'];

type Metrics = {
  total: number;
  today: number;
  topIndustry: string;
  topSource: string;
  byDay: { date: string; count: number }[];
  byIndustry: { name: string; value: number }[];
  bySource: { name: string; value: number }[];
};

function computeMetrics(records: Registration[]): Metrics {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter((r) => r.created_at.slice(0, 10) === today).length;

  // 일별
  const dayMap: Record<string, number> = {};
  records.forEach((r) => {
    const d = r.created_at.slice(0, 10);
    dayMap[d] = (dayMap[d] || 0) + 1;
  });
  const byDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  // 산업군
  const indMap: Record<string, number> = {};
  records.forEach((r) => { indMap[r.industry] = (indMap[r.industry] || 0) + 1; });
  const byIndustry = Object.entries(indMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // 신청 경로
  const srcMap: Record<string, number> = {};
  records.forEach((r) => { srcMap[r.referral_source] = (srcMap[r.referral_source] || 0) + 1; });
  const bySource = Object.entries(srcMap)
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
  };
}

export default function AdminDashboard() {
  const { accessToken } = useAdmin();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/registrations?limit=10000', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { data } = await res.json();
      setMetrics(computeMetrics(data || []));
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
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

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

        {/* 신청 경로 분포 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
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
  );
}
