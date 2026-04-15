'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Registration } from '@/lib/types';

export default function TrashPage() {
  const { user: admin, accessToken } = useAdmin();
  const [records, setRecords] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkRestore, setShowBulkRestore] = useState(false);
  const [showAllDelete, setShowAllDelete] = useState(false);
  const [showAllRestore, setShowAllRestore] = useState(false);
  const [processing, setProcessing] = useState(false);

  const canDelete = admin?.role === 'admin';

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/registrations?deleted=true&limit=100', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setRecords(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchTrash();
  }, [accessToken, fetchTrash]);

  const handleRestore = async (id: string) => {
    await fetch(`/api/admin/registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ restore: true }),
    });
    fetchTrash();
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('완전히 삭제하시겠습니까? 복구할 수 없습니다.')) return;
    await fetch('/api/admin/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, permanent: true }),
    });
    fetchTrash();
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBulkAction = async (action: 'restore' | 'delete', ids: string[]) => {
    setProcessing(true);
    if (action === 'restore') {
      await Promise.all(ids.map((id) =>
        fetch(`/api/admin/registrations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ restore: true }),
        })
      ));
    } else {
      for (const id of ids) {
        await fetch('/api/admin/registrations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ id, permanent: true }),
        });
      }
    }
    setProcessing(false);
    setSelected(new Set());
    setShowBulkDelete(false);
    setShowBulkRestore(false);
    setShowAllDelete(false);
    setShowAllRestore(false);
    fetchTrash();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };

  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 3 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">휴지통</h1>
          <p className="text-sm text-gray-400 mt-1">삭제된 등록 정보는 3일간 보관 후 자동 삭제됩니다.</p>
        </div>
        {records.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {selected.size > 0 && (
              <button onClick={() => setShowBulkRestore(true)} className="text-sm px-3 py-2 rounded-lg font-medium border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">
                선택 복구 ({selected.size})
              </button>
            )}
            {selected.size > 0 && canDelete && (
              <button onClick={() => setShowBulkDelete(true)} className="btn-danger text-sm">
                선택 완전삭제 ({selected.size})
              </button>
            )}
            <button onClick={() => setShowAllRestore(true)} className="btn-secondary text-sm">
              전체 복구
            </button>
            {canDelete && (
              <button onClick={() => setShowAllDelete(true)} className="btn-danger text-sm">
                전체 완전삭제
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selected.size === records.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">성함</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">회사명</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">삭제일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">남은 기간</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-32">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">휴지통이 비어있습니다.</td></tr>
              ) : records.map((r) => {
                const daysLeft = getDaysLeft(r.updated_at);
                return (
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.updated_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft <= 1 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                        {daysLeft}일 남음
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleRestore(r.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">복구</button>
                        {canDelete && (
                          <button onClick={() => handlePermanentDelete(r.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">완전삭제</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 선택 복구 확인 */}
      {showBulkRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">선택 복구</h2>
            <p className="text-gray-500 text-sm mb-6">선택한 {selected.size}건을 복구하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('restore', Array.from(selected))} disabled={processing} className="btn-primary flex-1">
                {processing ? '처리 중...' : '복구'}
              </button>
              <button onClick={() => setShowBulkRestore(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 선택 완전삭제 확인 */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">선택 완전삭제</h2>
            <p className="text-gray-500 text-sm mb-2">선택한 {selected.size}건을 완전히 삭제하시겠습니까?</p>
            <p className="text-xs text-red-500 mb-6">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('delete', Array.from(selected))} disabled={processing} className="btn-danger flex-1">
                {processing ? '처리 중...' : '완전삭제'}
              </button>
              <button onClick={() => setShowBulkDelete(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 복구 확인 */}
      {showAllRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">전체 복구</h2>
            <p className="text-gray-500 text-sm mb-6">휴지통의 모든 항목({records.length}건)을 복구하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('restore', records.map((r) => r.id))} disabled={processing} className="btn-primary flex-1">
                {processing ? '처리 중...' : '전체 복구'}
              </button>
              <button onClick={() => setShowAllRestore(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 완전삭제 확인 */}
      {showAllDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">전체 완전삭제</h2>
            <p className="text-gray-500 text-sm mb-2">휴지통의 모든 항목({records.length}건)을 완전히 삭제하시겠습니까?</p>
            <p className="text-xs text-red-500 mb-6">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('delete', records.map((r) => r.id))} disabled={processing} className="btn-danger flex-1">
                {processing ? '처리 중...' : '전체 완전삭제'}
              </button>
              <button onClick={() => setShowAllDelete(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
