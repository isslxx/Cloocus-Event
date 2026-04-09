'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import { INDUSTRIES, COMPANY_SIZES, REFERRAL_SOURCES } from '@/lib/constants';
import { formatPhone } from '@/lib/validation';
import type { Registration } from '@/lib/types';

type SortKey = keyof Registration;

export default function RegistrationsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [records, setRecords] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 필터
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // 수정 모달
  const [editing, setEditing] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registration>>({});
  const [saving, setSaving] = useState(false);

  // 삭제 확인
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 50;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: sortKey,
        order: sortAsc ? 'asc' : 'desc',
      });
      if (search) params.set('search', search);
      if (filterIndustry) params.set('industry', filterIndustry);
      if (filterSize) params.set('company_size', filterSize);
      if (filterSource) params.set('referral_source', filterSource);

      const res = await fetch(`/api/admin/registrations?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setRecords(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, sortKey, sortAsc, search, filterIndustry, filterSize, filterSource]);

  useEffect(() => {
    if (accessToken) fetchRecords();
  }, [accessToken, fetchRecords]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const res = await fetch(`/api/admin/export?format=${format}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloocus_event_${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (record: Registration) => {
    setEditing(record);
    setEditForm({ ...record });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/registrations/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditing(null);
        fetchRecords();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDeleting(null);
        fetchRecords();
      }
    } catch {
      // ignore
    }
  };

  const totalPages = Math.ceil(total / limit);
  const canEditRecord = admin?.role === 'admin' || admin?.role === 'editor';
  const canDeleteRecord = admin?.role === 'admin';

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">등록 목록 ({total}건)</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('xlsx')} className="btn-secondary">
            XLSX 내보내기
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary">
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="이름, 회사, 이메일 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select
          value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">산업군 전체</option>
          {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={filterSize}
          onChange={(e) => { setFilterSize(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">기업 규모 전체</option>
          {COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">신청 경로 전체</option>
          {REFERRAL_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { key: 'name' as SortKey, label: '성함' },
                  { key: 'company_name' as SortKey, label: '회사명' },
                  { key: 'email' as SortKey, label: '이메일' },
                  { key: 'phone' as SortKey, label: '연락처' },
                  { key: 'industry' as SortKey, label: '산업군' },
                  { key: 'company_size' as SortKey, label: '기업 규모' },
                  { key: 'referral_source' as SortKey, label: '신청 경로' },
                  { key: 'created_at' as SortKey, label: '등록일' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}{sortIcon(col.key)}
                  </th>
                ))}
                {(canEditRecord || canDeleteRecord) && (
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-24">작업</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">등록 데이터가 없습니다.</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.industry}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.company_size}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.referral_source}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  {(canEditRecord || canDeleteRecord) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {canEditRecord && (
                          <button
                            onClick={() => handleEdit(r)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            수정
                          </button>
                        )}
                        {canDeleteRecord && (
                          <button
                            onClick={() => setDeleting(r.id)}
                            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {(page - 1) * limit + 1}~{Math.min(page * limit, total)} / {total}건
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                이전
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">등록 정보 수정</h2>
            <div className="space-y-4">
              {([
                ['name', '성함'],
                ['company_name', '회사명'],
                ['department', '부서명'],
                ['job_title', '직급'],
                ['email', '이메일'],
              ] as const).map(([key, label]) => (
                <div key={key} className="field">
                  <label>{label}</label>
                  <input
                    type="text"
                    value={String(editForm[key] || '')}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="field">
                <label>연락처</label>
                <input
                  type="tel"
                  value={String(editForm.phone || '')}
                  onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                  maxLength={13}
                />
              </div>
              <div className="field">
                <label>산업군</label>
                <select
                  value={editForm.industry || ''}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                >
                  {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>기업 규모</label>
                <select
                  value={editForm.company_size || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                >
                  {COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>신청 경로</label>
                <select
                  value={editForm.referral_source || ''}
                  onChange={(e) => setEditForm({ ...editForm, referral_source: e.target.value })}
                >
                  {REFERRAL_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>추천인</label>
                <input
                  type="text"
                  value={String(editForm.referrer_name || '')}
                  onChange={(e) => setEditForm({ ...editForm, referrer_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>문의사항</label>
                <textarea
                  rows={3}
                  value={String(editForm.inquiry || '')}
                  onChange={(e) => setEditForm({ ...editForm, inquiry: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">등록 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 등록 정보를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.</p>
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
