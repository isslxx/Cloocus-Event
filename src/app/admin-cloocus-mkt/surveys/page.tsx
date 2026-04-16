'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

export default function SurveyManagementPage() {
  const { accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [surveyStats, setSurveyStats] = useState<Record<string, { enabled: number; completed: number }>>({});

  const fetchData = useCallback(async () => {
    try {
      const [evtRes, statsRes] = await Promise.all([
        fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/survey-stats', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const evtData = await evtRes.json();
      setEvents(Array.isArray(evtData) ? evtData : []);
      const statsData = await statsRes.json();
      setSurveyStats(statsData || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchData();
  }, [accessToken, fetchData]);

  const defaultQuestions = [
    { num: 1, text: '교육 전 Microsoft Azure에 대한 이해 수준은 어느 정도입니까?', type: '단일 선택', required: true, options: ['전혀 모름', '기본 개념', '기초 수준', '중급 수준', '고급 수준'] },
    { num: 2, text: '오늘 참여한 이벤트의 난이도는 어떠셨나요?', type: '단일 선택', required: true, options: ['매우 쉬움', '적절함', '다소 어려움', '매우 어려움'] },
    { num: 3, text: '본 이벤트에 참여하신 목적은 무엇입니까?', type: '복수 선택', required: true, options: ['기초 지식 확보', '클라우드 비교/평가', 'PoC 준비', 'Azure 전환 검토', 'Azure 기술 고도화', '기타'] },
    { num: 4, text: '현재 Microsoft Azure 도입 또는 마이그레이션을 고려 중입니까?', type: '단일 선택', required: true, options: ['이미 사용 중 (확장 계획 있음)', '이미 사용 중 (확장 계획 없음)', '6개월 이내', '1년 이내', '계획 없음'] },
    { num: 5, text: 'Microsoft Azure 추가 활용에 대한 클루커스의 컨설팅이 필요하십니까?', type: '복수 선택', required: true, options: ['추가 컨설팅 필요', '교육/세미나 소식 필요', '필요 없음'] },
    { num: 6, text: '참여 후기, 피드백', type: '서술형', required: false, options: [] },
  ];

  if (loading) return <p className="text-gray-400">로딩 중...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">설문조사 관리</h1>

      {/* 기본 설문조사 구성 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-lg mb-4">기본 설문조사 구성</h2>
        <div className="space-y-3">
          {defaultQuestions.map((q) => (
            <div key={q.num} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-blue-600 mr-1">Q{q.num}.</span>
                    {q.text}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{q.type}</p>
                  {q.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {q.options.map((opt) => (
                        <span key={opt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 이벤트별 설문 현황 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">이벤트별 설문 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">이벤트명</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">설문 활성</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">설문 완료</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">완료율</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => {
                const stats = surveyStats[evt.id] || { enabled: 0, completed: 0 };
                const rate = stats.enabled > 0 ? Math.round((stats.completed / stats.enabled) * 100) : 0;
                return (
                  <tr key={evt.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{evt.name}</td>
                    <td className="px-4 py-3 text-right">{stats.enabled}</td>
                    <td className="px-4 py-3 text-right">{stats.completed}</td>
                    <td className="px-4 py-3 text-right">
                      {stats.enabled > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rate >= 70 ? 'bg-green-100 text-green-700' : rate >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rate}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">이벤트가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
