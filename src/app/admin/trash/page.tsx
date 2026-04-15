'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Registration } from '@/lib/types';

export default function TrashPage() {
  const { user: admin, accessToken } = useAdmin();
  const [records, setRecords] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

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
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('완전히 삭제하시겠습니까? 복구할 수 없습니다.')) return;
    await fetch('/api/admin/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, permanent: true }),
    });
    fetchTrash();
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
      <h1 className="text-2xl font-bold mb-2">휴지통</h1>
      <p className="text-sm text-gray-400 mb-6">삭제된 등록 정보는 3일간 보관 후 자동 삭제됩니다.</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
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
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">휴지통이 비어있습니다.</td></tr>
              ) : records.map((r) => {
                const daysLeft = getDaysLeft(r.updated_at);
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.company_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.email}</td>
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
    </div>
  );
}
