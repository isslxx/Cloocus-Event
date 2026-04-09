'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { AdminUser } from '@/lib/types';

export default function UsersPage() {
  const { accessToken } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // 초대 모달
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchUsers();
  }, [accessToken, fetchUsers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !invitePassword) {
      setInviteError('모든 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    setInviteError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: inviteEmail,
          display_name: inviteName,
          role: inviteRole,
          password: invitePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || '오류가 발생했습니다.');
        return;
      }

      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setInviteRole('viewer');
      fetchUsers();
    } catch {
      setInviteError('네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id }),
      });
      setDeleting(null);
      fetchUsers();
    } catch {
      // ignore
    }
  };

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    editor: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <button onClick={() => setShowInvite(true)} className="btn-primary text-sm">
          + 사용자 초대
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">역할</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-20">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">등록된 사용자가 없습니다.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.display_name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border-0 font-medium ${roleBadge[u.role]}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleting(u.id)}
                    className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 초대 모달 */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">사용자 초대</h2>
            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {inviteError}
              </div>
            )}
            <div className="space-y-4">
              <div className="field">
                <label>이메일</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="field">
                <label>이름</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="표시 이름"
                />
              </div>
              <div className="field">
                <label>초기 비밀번호</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="초기 비밀번호 설정"
                />
              </div>
              <div className="field">
                <label>역할</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor' | 'viewer')}>
                  <option value="viewer">Viewer (읽기 전용)</option>
                  <option value="editor">Editor (수정 가능)</option>
                  <option value="admin">Admin (전체 관리)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleInvite} disabled={saving} className="btn-primary flex-1">
                {saving ? '생성 중...' : '생성'}
              </button>
              <button onClick={() => { setShowInvite(false); setInviteError(''); }} className="btn-secondary flex-1">
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
            <h2 className="text-lg font-bold mb-2">사용자 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 사용자를 삭제하시겠습니까?</p>
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
