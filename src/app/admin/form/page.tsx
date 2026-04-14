'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';

type FormOption = {
  id: string;
  field_key: string;
  label: string;
  sort_order: number;
  active: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  industry: '산업군',
  company_size: '기업 규모',
  referral_source: '신청 경로',
  privacy_policy: '개인정보 동의',
};

const FIELD_KEYS = ['industry', 'company_size', 'referral_source', 'privacy_policy'];

export default function FormManagePage() {
  const { user: admin, accessToken } = useAdmin();
  const [options, setOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('industry');

  // 추가/수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // 개인정보 동의 텍스트
  const [privacyText, setPrivacyText] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  const isAdmin = admin?.role === 'admin';

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/form-options', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const allOptions = Array.isArray(data) ? data : [];
      setOptions(allOptions);

      // 개인정보 동의 텍스트 로드
      const privacyOption = allOptions.find((o: FormOption) => o.field_key === 'privacy_policy');
      if (privacyOption) setPrivacyText(privacyOption.label);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchOptions();
  }, [accessToken, fetchOptions]);

  const currentOptions = options
    .filter((o) => o.field_key === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    const maxOrder = currentOptions.length > 0 ? Math.max(...currentOptions.map((o) => o.sort_order)) : 0;
    await fetch('/api/admin/form-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ field_key: activeTab, label: newLabel.trim(), sort_order: maxOrder + 1 }),
    });
    setNewLabel('');
    setSaving(false);
    fetchOptions();
  };

  const handleUpdate = async (id: string) => {
    if (!editLabel.trim()) return;
    await fetch('/api/admin/form-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, label: editLabel.trim() }),
    });
    setEditingId(null);
    fetchOptions();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch('/api/admin/form-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchOptions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;
    await fetch('/api/admin/form-options', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    fetchOptions();
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = currentOptions.findIndex((o) => o.id === id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= currentOptions.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const a = currentOptions[idx];
    const b = currentOptions[swapIdx];

    await Promise.all([
      fetch('/api/admin/form-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/form-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ]);
    fetchOptions();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">등록 페이지 관리</h1>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {FIELD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setEditingId(null); setNewLabel(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {FIELD_LABELS[key]}
          </button>
        ))}
      </div>

      {/* 개인정보 동의 편집 */}
      {activeTab === 'privacy_policy' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">개인정보 수집 및 이용 동의 내용</h3>
          <textarea
            rows={12}
            value={privacyText}
            onChange={(e) => { setPrivacyText(e.target.value); setPrivacySaved(false); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm leading-relaxed"
            placeholder="개인정보 수집 및 이용 동의 내용을 입력해주세요"
            disabled={!isAdmin}
          />
          {isAdmin && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={async () => {
                  setPrivacySaving(true);
                  const existing = options.find((o) => o.field_key === 'privacy_policy');
                  if (existing) {
                    await fetch('/api/admin/form-options', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ id: existing.id, label: privacyText }),
                    });
                  } else {
                    await fetch('/api/admin/form-options', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ field_key: 'privacy_policy', label: privacyText, sort_order: 1 }),
                    });
                  }
                  setPrivacySaving(false);
                  setPrivacySaved(true);
                  fetchOptions();
                }}
                disabled={privacySaving}
                className="btn-primary text-sm"
              >
                {privacySaving ? '저장 중...' : '저장'}
              </button>
              {privacySaved && <span className="text-sm text-green-600">저장되었습니다.</span>}
            </div>
          )}
        </div>
      ) : (

      /* 옵션 목록 */
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">{FIELD_LABELS[activeTab]} 옵션 관리</h3>
          <span className="text-xs text-gray-400">{currentOptions.filter((o) => o.active).length}개 활성</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">로딩 중...</div>
        ) : (
          <div>
            {currentOptions.map((opt, idx) => (
              <div key={opt.id} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-100 ${!opt.active ? 'opacity-40' : ''}`}>
                <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>

                {editingId === opt.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(opt.id)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(opt.id)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg">취소</button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{opt.label}</span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleReorder(opt.id, 'up')} disabled={idx === 0} className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                        <button onClick={() => handleReorder(opt.id, 'down')} disabled={idx === currentOptions.length - 1} className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
                        <button onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">수정</button>
                        <button onClick={() => handleToggle(opt.id, opt.active)} className={`text-xs px-2 py-1 rounded ${opt.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {opt.active ? '활성' : '비활성'}
                        </button>
                        <button onClick={() => handleDelete(opt.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* 새 옵션 추가 */}
            {isAdmin && (
              <div className="flex items-center gap-3 px-5 py-3 bg-gray-50">
                <span className="text-xs text-gray-400 w-6 text-center">+</span>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={`새 ${FIELD_LABELS[activeTab]} 옵션 추가...`}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button onClick={handleAdd} disabled={saving || !newLabel.trim()} className="btn-primary text-xs disabled:opacity-40">
                  추가
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        여기서 수정한 옵션은 이벤트 등록 페이지에 즉시 반영됩니다. 비활성화된 옵션은 등록 폼에 표시되지 않습니다.
      </p>
    </div>
  );
}
