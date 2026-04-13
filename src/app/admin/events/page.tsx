'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

export default function EventsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 모달
  const [editing, setEditing] = useState<Event | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<'online' | 'offline'>('offline');
  const [formStatus, setFormStatus] = useState<'open' | 'closed'>('open');
  const [formLocation, setFormLocation] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formCapacity, setFormCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCloseAll, setShowCloseAll] = useState(false);
  const [showCloseSelected, setShowCloseSelected] = useState(false);

  const isAdmin = admin?.role === 'admin';

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchEvents();
  }, [accessToken, fetchEvents]);

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setFormName('');
    setFormDate('');
    setFormType('offline');
    setFormStatus('open');
    setFormLocation('');
    setFormTime('');
    setFormVisible(true);
    setFormCapacity('');
  };

  const openEdit = (event: Event) => {
    setIsNew(false);
    setEditing(event);
    setFormName(event.name);
    setFormDate(event.event_date);
    setFormType(event.event_type);
    setFormStatus(event.status);
    setFormLocation(event.location || '');
    setFormTime(event.event_time || '');
    setFormVisible(event.visible !== false);
    setFormCapacity(event.capacity ? String(event.capacity) : '');
  };

  const handleSave = async () => {
    if (!formName.trim() || !formDate) return;
    setSaving(true);
    try {
      const body = { name: formName.trim(), event_date: formDate, event_type: formType, status: formStatus, location: formLocation.trim(), event_time: formTime.trim(), visible: formVisible, capacity: formCapacity ? parseInt(formCapacity) : null };
      if (isNew) {
        await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (editing) {
        await fetch(`/api/admin/events/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      setEditing(null);
      setIsNew(false);
      fetchEvents();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDeleting(null);
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      fetchEvents();
    } catch {
      // ignore
    }
  };

  const toggleVisible = async (event: Event) => {
    await fetch(`/api/admin/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ visible: !event.visible }),
    });
    fetchEvents();
  };

  const toggleStatus = async (event: Event) => {
    const newStatus = event.status === 'open' ? 'closed' : 'open';
    await fetch(`/api/admin/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchEvents();
  };

  const closeAllEvents = async () => {
    setShowCloseAll(false);
    const openEvents = events.filter((e) => e.status === 'open');
    await Promise.all(
      openEvents.map((e) =>
        fetch(`/api/admin/events/${e.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ status: 'closed' }),
        })
      )
    );
    fetchEvents();
  };

  const closeSelectedEvents = async () => {
    setShowCloseSelected(false);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ status: 'closed' }),
        })
      )
    );
    setSelected(new Set());
    fetchEvents();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(events.map((e) => e.id)));
    }
  };

  const hasOpenEvents = events.some((e) => e.status === 'open');
  const selectedOpenCount = Array.from(selected).filter((id) => events.find((e) => e.id === id)?.status === 'open').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">이벤트 관리</h1>
        {isAdmin && (
          <div className="flex gap-2">
            {selected.size > 0 && selectedOpenCount > 0 && (
              <button
                onClick={() => setShowCloseSelected(true)}
                className="btn-danger text-sm"
              >
                선택 마감 ({selectedOpenCount})
              </button>
            )}
            <button
              onClick={() => setShowCloseAll(true)}
              disabled={!hasOpenEvents}
              className="btn-danger text-sm disabled:opacity-40"
            >
              모든 이벤트 종료
            </button>
            <button onClick={openNew} className="btn-primary text-sm">
              + 이벤트 추가
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={events.length > 0 && selected.size === events.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-600">이벤트명</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">날짜</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">유형</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">정원</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">노출</th>
              {isAdmin && <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">작업</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">등록된 이벤트가 없습니다.</td></tr>
            ) : events.map((event) => (
              <tr key={event.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(event.id) ? 'bg-blue-50/50' : ''}`}>
                {isAdmin && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(event.id)}
                      onChange={() => toggleSelect(event.id)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium">{event.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(event.event_date).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    event.event_type === 'online'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {event.event_type === 'online' ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">
                  {event.capacity ? `${event.capacity}명` : '-'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => isAdmin && toggleStatus(event)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.status === 'open'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                    disabled={!isAdmin}
                  >
                    {event.status === 'open' ? '모집중' : '마감'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => isAdmin && toggleVisible(event)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.visible !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                    disabled={!isAdmin}
                  >
                    {event.visible !== false ? '노출' : '숨김'}
                  </button>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(event)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleting(event.id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 모달 */}
      {(isNew || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{isNew ? '이벤트 추가' : '이벤트 수정'}</h2>
            <div className="space-y-4">
              <div className="field">
                <label>이벤트명</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 4/28(화) 스프린트 - Azure 인프라 입문"
                />
              </div>
              <div className="field">
                <label>날짜</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="field">
                <label>장소</label>
                <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="예: 서울 강남구 역삼동 (선택)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>시간</label>
                  <input type="text" value={formTime} onChange={(e) => setFormTime(e.target.value)} placeholder="예: 14:00 ~ 17:00" />
                </div>
                <div className="field">
                  <label>정원</label>
                  <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="예: 30 (미입력 시 제한없음)" min="1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="field">
                  <label>유형</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as 'online' | 'offline')}>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="field">
                  <label>상태</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'open' | 'closed')}>
                    <option value="open">모집중</option>
                    <option value="closed">마감</option>
                  </select>
                </div>
                <div className="field">
                  <label>노출</label>
                  <select value={formVisible ? 'true' : 'false'} onChange={(e) => setFormVisible(e.target.value === 'true')}>
                    <option value="true">노출</option>
                    <option value="false">숨김</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary flex-1">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모든 이벤트 종료 확인 */}
      {showCloseAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">모든 이벤트 종료</h2>
            <p className="text-gray-500 text-sm mb-6">
              모든 이벤트를 마감하시겠습니까?<br />
              고객 화면에서 등록이 불가능해집니다.
            </p>
            <div className="flex gap-2">
              <button onClick={closeAllEvents} className="btn-danger flex-1">전체 마감</button>
              <button onClick={() => setShowCloseAll(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 선택 이벤트 마감 확인 */}
      {showCloseSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">선택 이벤트 마감</h2>
            <p className="text-gray-500 text-sm mb-6">
              선택한 {selectedOpenCount}개 이벤트를 마감하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button onClick={closeSelectedEvents} className="btn-danger flex-1">마감</button>
              <button onClick={() => setShowCloseSelected(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">이벤트 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 이벤트를 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleting)} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
