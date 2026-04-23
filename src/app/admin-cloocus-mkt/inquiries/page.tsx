'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';

type InquiryItem = {
  id: string;
  name: string;
  company_name: string;
  email: string;
  inquiry: string;
  inquiry_status: string;
  event_id: string;
  event_name: string;
  comment_count: number;
  survey_feedback: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  author_type: string;
  author_name: string;
  content: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: '답변 대기', cls: 'bg-yellow-100 text-yellow-700' },
  answered: { text: '답변 완료', cls: 'bg-green-100 text-green-700' },
  dismissed: { text: '관리자 응답 불필요', cls: 'bg-gray-100 text-gray-500' },
};

export default function InquiriesPage() {
  const { user: admin, accessToken } = useAdmin();
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

  // 답변 패널
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);

  const isEditable = admin?.role !== 'viewer';

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (eventFilter) params.set('event_id', eventFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/inquiries?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken, statusFilter, eventFilter, search]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })) : []);
    } catch { /* ignore */ }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) { fetchData(); fetchEvents(); }
  }, [accessToken, fetchData, fetchEvents]);

  const openPanel = async (id: string) => {
    setSelectedId(id);
    setCommentsLoading(true);
    setReplyContent('');
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setCommentsLoading(false); }
  };

  const sendReply = async () => {
    if (!selectedId || !replyContent.trim() || replySending) return;
    setReplySending(true);
    try {
      await fetch(`/api/admin/inquiries/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      setReplyContent('');
      openPanel(selectedId);
      // 리스트도 갱신
      setItems((prev) => prev.map((item) =>
        item.id === selectedId ? { ...item, inquiry_status: 'answered', comment_count: item.comment_count + 1 } : item
      ));
    } catch { /* ignore */ }
    finally { setReplySending(false); }
  };

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/inquiries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ inquiry_status: status }),
    });
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, inquiry_status: status } : item));
  };

  const selectedItem = items.find((i) => i.id === selectedId);
  const pendingCount = items.filter((i) => i.inquiry_status === 'pending').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">문의 관리</h1>
          {pendingCount > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-bold">
              답변 대기 {pendingCount}건
            </span>
          )}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="all">전체 상태</option>
          <option value="pending">답변 대기</option>
          <option value="answered">답변 완료</option>
          <option value="dismissed">관리자 응답 불필요</option>
        </select>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="">전체 이벤트</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 회사명, 문의 내용 검색..."
          className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded-lg px-3 py-2"
        />
      </div>

      <div className="flex gap-4">
        {/* 문의 리스트 */}
        <div className={`${selectedId ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-400">로딩 중...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">문의사항이 없습니다.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const st = STATUS_LABELS[item.inquiry_status] || STATUS_LABELS.pending;
                  return (
                    <div
                      key={item.id}
                      className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedId === item.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                      onClick={() => openPanel(item.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${st.cls}`}>{st.text}</span>
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                          <span className="text-xs text-gray-400">{item.company_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.comment_count > 0 && (
                            <span className="text-xs text-gray-400">💬 {item.comment_count}</span>
                          )}
                          <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{item.inquiry || item.survey_feedback}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.event_name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 답변 패널 */}
        {selectedId && selectedItem && (
          <div className="w-1/2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <p className="font-medium text-sm">{selectedItem.name} · {selectedItem.company_name}</p>
                <p className="text-xs text-gray-400">{selectedItem.email} · {selectedItem.event_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {isEditable && (
                  <select
                    value={selectedItem.inquiry_status}
                    onChange={(e) => changeStatus(selectedItem.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="pending">답변 대기</option>
                    <option value="answered">답변 완료</option>
                    <option value="dismissed">관리자 응답 불필요</option>
                  </select>
                )}
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
            </div>

            {/* 대화 히스토리 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {/* 최초 문의 (등록 시 작성) */}
              {selectedItem.inquiry && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {selectedItem.name[0]}
                        </span>
                        <span className="text-xs font-medium text-gray-600">{selectedItem.name}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedItem.inquiry}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(selectedItem.created_at).toLocaleDateString('ko-KR')} (등록 시 작성)
                    </p>
                  </div>
                </div>
              )}

              {/* 설문 피드백 (q6) — 기존 문의 채팅에 추가되는 메시지 형태 */}
              {selectedItem.survey_feedback && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {selectedItem.name[0]}
                        </span>
                        <span className="text-xs font-medium text-gray-600">{selectedItem.name}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedItem.survey_feedback}</p>
                    </div>
                  </div>
                </div>
              )}

              {commentsLoading ? (
                <div className="text-center py-4 text-gray-400 text-sm">로딩 중...</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={`flex ${c.author_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%]">
                      {c.author_type === 'admin' ? (
                        <div className="bg-blue-50 rounded-xl rounded-tr-sm px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">C</span>
                            <span className="text-xs font-medium text-blue-700">{c.author_name}</span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                              {c.author_name[0]}
                            </span>
                            <span className="text-xs font-medium text-gray-600">{c.author_name}</span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      )}
                      <p className={`text-xs text-gray-400 mt-1 ${c.author_type === 'admin' ? 'text-right' : ''}`}>
                        {new Date(c.created_at).toLocaleDateString('ko-KR')} {new Date(c.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 답변 입력 */}
            {isEditable && (
              <div className="shrink-0 px-4 py-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyContent.trim()) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="답변을 입력하세요... (Ctrl+Enter로 전송)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyContent.trim() || replySending}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 shrink-0 self-end"
                  >
                    {replySending ? '...' : '답변'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
