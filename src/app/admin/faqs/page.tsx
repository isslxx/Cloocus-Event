'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { FAQ } from '@/lib/types';

export default function FaqsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = admin?.role === 'admin';

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/faqs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setFaqs(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchFaqs();
  }, [accessToken, fetchFaqs]);

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormSortOrder(faqs.length + 1);
    setFormActive(true);
  };

  const openEdit = (faq: FAQ) => {
    setIsNew(false);
    setEditing(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSortOrder(faq.sort_order);
    setFormActive(faq.active);
  };

  const handleSave = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const body = {
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        sort_order: formSortOrder,
        active: formActive,
      };
      if (isNew) {
        await fetch('/api/admin/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (editing) {
        await fetch(`/api/admin/faqs/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      setEditing(null);
      setIsNew(false);
      fetchFaqs();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDeleting(null);
      fetchFaqs();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">FAQ 관리</h1>
        {isAdmin && (
          <button onClick={openNew} className="btn-primary text-sm">
            + 추가
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">순서</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">질문</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">답변</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">활성</th>
              {isAdmin && <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">작업</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
            ) : faqs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">등록된 FAQ가 없습니다.</td></tr>
            ) : faqs.map((faq) => (
              <tr key={faq.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{faq.sort_order}</td>
                <td className="px-4 py-3 font-medium">{faq.question}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[300px] truncate">{faq.answer}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    faq.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {faq.active ? '활성' : '비활성'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(faq)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleting(faq.id)}
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
            <h2 className="text-lg font-bold mb-4">{isNew ? 'FAQ 추가' : 'FAQ 수정'}</h2>
            <div className="space-y-4">
              <div className="field">
                <label>질문</label>
                <textarea
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="자주 묻는 질문을 입력하세요"
                />
              </div>
              <div className="field">
                <label>답변</label>
                <textarea
                  rows={5}
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="답변을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>순서</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="field">
                  <label>활성</label>
                  <select
                    value={formActive ? 'true' : 'false'}
                    onChange={(e) => setFormActive(e.target.value === 'true')}
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
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

      {/* 삭제 확인 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">FAQ 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 FAQ를 삭제하시겠습니까?</p>
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
