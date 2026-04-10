'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { EmailLog, Event } from '@/lib/types';

export default function EmailsPage() {
  const { accessToken } = useAdmin();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  // 필터
  const [filterEvent, setFilterEvent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // 상세 보기
  const [detail, setDetail] = useState<EmailLog | null>(null);

  const limit = 50;

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterEvent) params.set('event_id', filterEvent);
      if (filterType) params.set('email_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/email-logs?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, filterEvent, filterType, filterStatus, search]);

  useEffect(() => {
    if (accessToken) fetchLogs();
  }, [accessToken, fetchLogs]);

  const totalPages = Math.ceil(total / limit);
  const eventNameMap = new Map(events.map((e) => [e.id, e.name]));

  // 통계 계산
  const totalSent = logs.length > 0 ? total : 0;
  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const confirmedCount = logs.filter((l) => l.email_type === 'confirmed').length;
  const rejectedCount = logs.filter((l) => l.email_type === 'rejected').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">발송 완료</span>;
      case 'failed': return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">발송 실패</span>;
      case 'pending': return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">대기중</span>;
      default: return <span className="text-xs text-gray-400">-</span>;
    }
  };

  const typeBadge = (type: string) => {
    return type === 'confirmed'
      ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">등록 확정</span>
      : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">등록 불가</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">이메일 발송 관리</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">총 발송</p>
          <p className="text-xl font-bold mt-1">{totalSent}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-600">발송 성공</p>
          <p className="text-xl font-bold text-green-700 mt-1">{sentCount}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-500">발송 실패</p>
          <p className="text-xl font-bold text-red-600 mt-1">{failedCount}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-500">등록 확정</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">등록 불가</p>
          <p className="text-xl font-bold text-gray-700 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="이메일, 이름 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select value={filterEvent} onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">이벤트 전체</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">유형 전체</option>
          <option value="confirmed">등록 확정</option>
          <option value="rejected">등록 불가</option>
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">상태 전체</option>
          <option value="sent">발송 완료</option>
          <option value="failed">발송 실패</option>
          <option value="pending">대기중</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">수신자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이벤트</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">유형</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">발송 시간</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">발송자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">상세</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">발송 기록이 없습니다.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{log.recipient_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{log.recipient_email}</td>
                  <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate">{log.subject}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 max-w-[150px] truncate">
                    {log.event_id ? (eventNameMap.get(log.event_id) || '-') : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{typeBadge(log.email_type)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{statusBadge(log.status)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {new Date(log.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{log.sent_by}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setDetail(log)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">{(page - 1) * limit + 1}~{Math.min(page * limit, total)} / {total}건</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">이전</button>
              <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn-secondary text-xs disabled:opacity-40">다음</button>
            </div>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">이메일 발송 상세</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">수신자</span>
                <span className="font-medium">{detail.recipient_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">이메일</span>
                <span>{detail.recipient_email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">제목</span>
                <span className="font-medium">{detail.subject}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">이벤트</span>
                <span>{detail.event_id ? (eventNameMap.get(detail.event_id) || '-') : '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">유형</span>
                {typeBadge(detail.email_type)}
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">상태</span>
                {statusBadge(detail.status)}
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">발송 시간</span>
                <span>{new Date(detail.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">발송자</span>
                <span>{detail.sent_by}</span>
              </div>
              {detail.error_message && (
                <div className="py-2">
                  <span className="text-gray-500 block mb-1">오류 메시지</span>
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-xs break-all">
                    {detail.error_message}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setDetail(null)} className="btn-secondary w-full mt-6">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
