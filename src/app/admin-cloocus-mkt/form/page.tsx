'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import type { Event } from '@/lib/types';

type FormOption = {
  id: string;
  field_key: string;
  label: string;
  sort_order: number;
  active: boolean;
};

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'agreement';

type CustomQuestion = {
  id: string;
  event_id: string;
  question_type: QuestionType;
  label: string;
  description: string | null;
  options: { label: string }[];
  required: boolean;
  allow_etc: boolean;
  active: boolean;
  sort_order: number;
};

const FIELD_LABELS: Record<string, string> = {
  industry: '산업군',
  company_size: '기업 규모',
  referral_source: '신청 경로',
  privacy_policy: '개인정보 동의',
};

const FIELD_KEYS = ['industry', 'company_size', 'referral_source', 'privacy_policy'];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: '단답 (한 줄)',
  long_text: '장문 (여러 줄)',
  single_choice: '객관식 단일 선택',
  multi_choice: '객관식 복수 선택',
  agreement: '동의 체크박스',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  short_text: '✏️',
  long_text: '📝',
  single_choice: '🔘',
  multi_choice: '☑️',
  agreement: '✅',
};

export default function FormManagePage() {
  const { user: admin, accessToken } = useAdmin();
  const isAdmin = admin?.role === 'admin';

  // 공통 옵션 영역
  const [options, setOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('industry');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // 개인정보 동의
  const [privacyPolicies, setPrivacyPolicies] = useState<{ id: string; category: string; content: string; title?: string }[]>([]);
  const [privacyTab, setPrivacyTab] = useState('MS');
  const [privacyTitle, setPrivacyTitle] = useState('개인정보 수집 및 이용 동의');
  const [privacyText, setPrivacyText] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  // 이벤트 선택 (스코프)
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // 커스텀 문항
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Partial<CustomQuestion> | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // 섹션 제목 (신청자에게 노출되는 추가 문항 박스 제목)
  const DEFAULT_SECTION_TITLE = '맞춤 혜택 안내를 위한 추가 정보';
  const [sectionTitleDraft, setSectionTitleDraft] = useState('');
  const [sectionTitleSaving, setSectionTitleSaving] = useState(false);
  const [sectionTitleSaved, setSectionTitleSaved] = useState(false);

  const fetchOptions = useCallback(async () => {
    try {
      const [optRes, privRes] = await Promise.all([
        fetch('/api/admin/form-options', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/privacy-policies', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const data = await optRes.json();
      setOptions(Array.isArray(data) ? data : []);

      const privData = await privRes.json();
      const policies = Array.isArray(privData) ? privData : [];
      setPrivacyPolicies(policies);
      const current = policies.find((p: { category: string }) => p.category === privacyTab);
      if (current) {
        setPrivacyText(current.content);
        setPrivacyTitle(current.title || '개인정보 수집 및 이용 동의');
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [accessToken, privacyTab]);

  useEffect(() => {
    if (accessToken) fetchOptions();
  }, [accessToken, fetchOptions]);

  // 이벤트 목록 로드
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [accessToken]);

  // 선택된 이벤트의 커스텀 문항 로드
  const fetchQuestions = useCallback(async () => {
    if (!selectedEventId || !accessToken) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/admin/event-questions?event_id=${selectedEventId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedEventId, accessToken]);

  useEffect(() => {
    fetchQuestions();
    setEditingQuestionId(null);
    setDraftQuestion(null);
    setShowTypeMenu(false);
  }, [fetchQuestions]);

  // 선택 이벤트가 바뀔 때 섹션 제목 동기화
  useEffect(() => {
    setSectionTitleDraft(selectedEvent?.custom_questions_section_title || '');
    setSectionTitleSaved(false);
  }, [selectedEvent?.id, selectedEvent?.custom_questions_section_title]);

  const saveSectionTitle = async () => {
    if (!selectedEventId) return;
    setSectionTitleSaving(true);
    try {
      const value = sectionTitleDraft.trim();
      const res = await fetch(`/api/admin/events/${selectedEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ custom_questions_section_title: value || null }),
      });
      if (res.ok) {
        // 로컬 events 배열도 갱신
        setEvents((prev) => prev.map((e) =>
          e.id === selectedEventId ? { ...e, custom_questions_section_title: value || null } : e
        ));
        setSectionTitleSaved(true);
      }
    } finally {
      setSectionTitleSaving(false);
    }
  };

  const currentOptions = options
    .filter((o) => o.field_key === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ============ 공통 옵션 핸들러 ============
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

  // ============ 커스텀 문항 핸들러 ============
  const startNewQuestion = (type: QuestionType) => {
    setShowTypeMenu(false);
    setEditingQuestionId('__new__');
    setDraftQuestion({
      question_type: type,
      label: '',
      description: '',
      options: type === 'single_choice' || type === 'multi_choice' ? [{ label: '' }, { label: '' }] : [],
      required: false,
      allow_etc: false,
    });
  };

  const startEditQuestion = (q: CustomQuestion) => {
    setEditingQuestionId(q.id);
    setDraftQuestion({
      ...q,
      options: q.options?.length ? q.options : [{ label: '' }, { label: '' }],
    });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setDraftQuestion(null);
  };

  const saveQuestion = async () => {
    if (!draftQuestion || !selectedEventId) return;
    if (!draftQuestion.label?.trim()) {
      alert('문항 내용을 입력해주세요.');
      return;
    }
    if ((draftQuestion.question_type === 'single_choice' || draftQuestion.question_type === 'multi_choice')) {
      const validOpts = (draftQuestion.options || []).filter((o) => o.label.trim().length > 0);
      if (validOpts.length < 2) {
        alert('객관식은 최소 2개 이상의 옵션이 필요합니다.');
        return;
      }
    }

    setSavingQuestion(true);
    try {
      if (editingQuestionId === '__new__') {
        await fetch('/api/admin/event-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ event_id: selectedEventId, ...draftQuestion }),
        });
      } else if (editingQuestionId) {
        await fetch('/api/admin/event-questions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ id: editingQuestionId, ...draftQuestion }),
        });
      }
      setEditingQuestionId(null);
      setDraftQuestion(null);
      fetchQuestions();
    } finally {
      setSavingQuestion(false);
    }
  };

  const toggleQuestionActive = async (q: CustomQuestion) => {
    await fetch('/api/admin/event-questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id: q.id, active: !q.active }),
    });
    fetchQuestions();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('이 문항을 삭제하시겠습니까? 기존 응답은 그대로 보존됩니다.')) return;
    await fetch('/api/admin/event-questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    fetchQuestions();
  };

  const reorderQuestion = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((q) => q.id === id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const a = sorted[idx];
    const b = sorted[swapIdx];

    await Promise.all([
      fetch('/api/admin/event-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/event-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ]);
    fetchQuestions();
  };

  return (
    <div>
      {/* 헤더 + 이벤트 선택 */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">등록 페이지 관리</h1>
          <p className="text-xs text-gray-500 mt-1">
            {selectedEvent
              ? <><span className="font-medium text-amber-700">{selectedEvent.name}</span> 의 등록 폼을 편집 중입니다.</>
              : '모든 이벤트에 공통으로 적용되는 기본 문항을 편집 중입니다.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[220px]"
          >
            <option value="">📋 공통 (모든 이벤트)</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>{evt.name}</option>
            ))}
          </select>
          {selectedEventId && (() => {
            const evt = events.find((e) => e.id === selectedEventId);
            const previewHref = evt?.slug ? `/${evt.slug}` : `/?preview_event=${selectedEventId}`;
            return (
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 inline-flex items-center gap-1"
              >
                👁 미리보기
              </a>
            );
          })()}
        </div>
      </div>

      {/* ZONE A: 공통 기본 문항 */}
      <section className={`mb-6 transition-opacity ${selectedEventId ? 'opacity-90' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-700">📋 공통 기본 문항</span>
          {selectedEventId ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">모든 이벤트 공통 · 여기서 수정 시 전체에 반영</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">모든 이벤트에 적용</span>
          )}
        </div>

        <div className="flex gap-2 mb-4">
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

        {activeTab === 'privacy_policy' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">개인정보 수집 및 이용 동의 관리</h3>
            <p className="text-xs text-gray-400 mb-4">행사 벤더에 따라 동의 문구를 다르게 설정할 수 있습니다. 이벤트 추가 시 카테고리를 선택하면 해당 동의 문구가 적용됩니다.</p>

            <div className="flex gap-2 mb-4">
              {['MS', 'GCP', 'NCP', '기타'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setPrivacyTab(cat);
                    const policy = privacyPolicies.find((p) => p.category === cat);
                    setPrivacyText(policy?.content || '');
                    setPrivacyTitle(policy?.title || '개인정보 수집 및 이용 동의');
                    setPrivacySaved(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    privacyTab === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="field mb-4">
              <label>동의 제목</label>
              <input
                type="text"
                value={privacyTitle}
                onChange={(e) => { setPrivacyTitle(e.target.value); setPrivacySaved(false); }}
                placeholder="예: 개인정보 수집 및 이용 동의"
                disabled={!isAdmin}
              />
            </div>

            <div className="field">
              <label>동의 내용</label>
            </div>
            <textarea
              rows={14}
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
                    const existing = privacyPolicies.find((p) => p.category === privacyTab);
                    if (existing) {
                      await fetch('/api/admin/privacy-policies', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: JSON.stringify({ id: existing.id, content: privacyText, title: privacyTitle }),
                      });
                    }
                    setPrivacySaving(false);
                    setPrivacySaved(true);
                    fetchOptions();
                  }}
                  disabled={privacySaving}
                  className="btn-primary text-sm"
                >
                  {privacySaving ? '저장 중...' : `${privacyTab} 동의 문구 저장`}
                </button>
                {privacySaved && <span className="text-sm text-green-600">저장되었습니다.</span>}
              </div>
            )}
          </div>
        ) : (
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
      </section>

      {/* ZONE B: 이벤트 전용 추가 문항 */}
      {selectedEvent ? (
        <section className="rounded-xl border-2 border-amber-200 bg-amber-50/30 p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-800">✨ 이벤트 전용 추가 문항</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium truncate max-w-[280px]">
                  &quot;{selectedEvent.name}&quot; 에만 적용
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">공통 4개 항목 외에, 이 이벤트에서만 받고 싶은 문항을 자유롭게 추가하세요.</p>
            </div>

            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowTypeMenu((v) => !v)}
                  className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                  + 문항 추가
                  <span className="text-xs">▾</span>
                </button>
                {showTypeMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => startNewQuestion(t)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span>{QUESTION_TYPE_ICONS[t]}</span>
                        <span>{QUESTION_TYPE_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 섹션 제목 편집기 — 신청자에게 보이는 추가 문항 박스 제목 */}
          <div className="bg-white rounded-lg border border-amber-200 p-3 mb-3">
            <label className="text-xs font-medium text-amber-800 mb-1.5 block">
              📝 신청자 폼에 표시될 섹션 제목
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sectionTitleDraft}
                onChange={(e) => { setSectionTitleDraft(e.target.value); setSectionTitleSaved(false); }}
                placeholder={DEFAULT_SECTION_TITLE}
                disabled={!isAdmin}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
              {isAdmin && (
                <button
                  onClick={saveSectionTitle}
                  disabled={sectionTitleSaving}
                  className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {sectionTitleSaving ? '저장 중...' : '제목 저장'}
                </button>
              )}
              {sectionTitleSaved && <span className="text-xs text-green-600 whitespace-nowrap">저장됨</span>}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              비워두면 기본값 <span className="font-medium">&quot;{DEFAULT_SECTION_TITLE}&quot;</span> 으로 표시됩니다.
            </p>
          </div>

          {questionsLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : questions.length === 0 && editingQuestionId !== '__new__' ? (
            <div className="bg-white rounded-lg border border-dashed border-amber-300 p-8 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-medium text-gray-700 mb-1">아직 추가된 문항이 없습니다</p>
              <p className="text-xs text-gray-500 mb-4">우측 상단의 [+ 문항 추가] 버튼을 눌러 첫 문항을 만들어보세요.</p>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => startNewQuestion(t)}
                      className="text-xs px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 text-gray-700"
                    >
                      {QUESTION_TYPE_ICONS[t]} {QUESTION_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[...questions].sort((a, b) => a.sort_order - b.sort_order).map((q, idx, arr) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  total={arr.length}
                  isEditing={editingQuestionId === q.id}
                  draft={editingQuestionId === q.id ? draftQuestion : null}
                  setDraft={setDraftQuestion}
                  isAdmin={isAdmin}
                  saving={savingQuestion}
                  onEdit={() => startEditQuestion(q)}
                  onCancel={cancelEditQuestion}
                  onSave={saveQuestion}
                  onToggle={() => toggleQuestionActive(q)}
                  onDelete={() => deleteQuestion(q.id)}
                  onReorderUp={() => reorderQuestion(q.id, 'up')}
                  onReorderDown={() => reorderQuestion(q.id, 'down')}
                />
              ))}

              {editingQuestionId === '__new__' && draftQuestion && (
                <QuestionCard
                  question={null}
                  index={questions.length}
                  total={questions.length + 1}
                  isEditing
                  draft={draftQuestion}
                  setDraft={setDraftQuestion}
                  isAdmin={isAdmin}
                  saving={savingQuestion}
                  onCancel={cancelEditQuestion}
                  onSave={saveQuestion}
                />
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 bg-gray-50/40">
          <p className="text-sm text-gray-600">
            <span className="font-medium">💡 팁 ·</span> 특정 이벤트(프로모션 등)에 별도 문항을 넣고 싶다면, 우측 상단에서 이벤트를 선택하세요.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        공통 기본 문항은 모든 이벤트 등록 페이지에 즉시 반영됩니다. 이벤트 전용 추가 문항은 해당 이벤트의 등록 페이지에서만 노출됩니다.
      </p>
    </div>
  );
}

// ============ 문항 카드 (인라인 편집기 포함) ============
type QuestionCardProps = {
  question: CustomQuestion | null;
  index: number;
  total: number;
  isEditing: boolean;
  draft: Partial<CustomQuestion> | null;
  setDraft: (d: Partial<CustomQuestion> | null) => void;
  isAdmin: boolean;
  saving: boolean;
  onEdit?: () => void;
  onCancel: () => void;
  onSave: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  onReorderUp?: () => void;
  onReorderDown?: () => void;
};

function QuestionCard({
  question, index, total, isEditing, draft, setDraft, isAdmin, saving,
  onEdit, onCancel, onSave, onToggle, onDelete, onReorderUp, onReorderDown,
}: QuestionCardProps) {
  if (isEditing && draft) {
    const type = draft.question_type as QuestionType;
    const isChoice = type === 'single_choice' || type === 'multi_choice';
    const isAgreement = type === 'agreement';

    return (
      <div className="bg-white rounded-lg border-2 border-amber-400 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
            {QUESTION_TYPE_ICONS[type]} {QUESTION_TYPE_LABELS[type]}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              {isAgreement ? '동의 문구' : '문항 내용'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={draft.label || ''}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={isAgreement ? '예: 마케팅 정보 수신에 동의합니다' : '예: 가장 관심 있는 주제는 무엇인가요?'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              autoFocus
            />
          </div>

          {!isAgreement && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">설명 (선택)</label>
              <input
                type="text"
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="신청자에게 보여줄 부가 설명"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}

          {isChoice && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                선택 옵션 <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(최소 2개)</span>
              </label>
              <div className="space-y-2">
                {(draft.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...(draft.options || [])];
                        next[i] = { label: e.target.value };
                        setDraft({ ...draft, options: next });
                      }}
                      placeholder={`옵션 ${i + 1}`}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        const next = (draft.options || []).filter((_, j) => j !== i);
                        setDraft({ ...draft, options: next });
                      }}
                      disabled={(draft.options || []).length <= 1}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setDraft({ ...draft, options: [...(draft.options || []), { label: '' }] })}
                  className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 w-full"
                >
                  + 옵션 추가
                </button>
              </div>
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft.allow_etc}
                  onChange={(e) => setDraft({ ...draft, allow_etc: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-600"
                />
                <span className="text-xs text-gray-700 leading-snug">
                  &quot;기타&quot; 옵션 포함하기
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    켜두면 신청자 폼에 자동으로 &quot;기타&quot; 선택지가 추가되고, 선택 시 직접 입력란이 표시됩니다.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-xs text-gray-700">필수 응답</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <button onClick={onCancel} disabled={saving} className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200">
            취소
          </button>
          <button onClick={onSave} disabled={saving} className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${!question.active ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 w-6 text-center pt-1">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {QUESTION_TYPE_ICONS[question.question_type]} {QUESTION_TYPE_LABELS[question.question_type]}
            </span>
            {question.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">필수</span>}
            {!question.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">비활성</span>}
          </div>
          <p className="text-sm font-medium text-gray-900">{question.label}</p>
          {question.description && <p className="text-xs text-gray-500 mt-0.5">{question.description}</p>}
          {(question.question_type === 'single_choice' || question.question_type === 'multi_choice') && (question.options.length > 0 || question.allow_etc) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {question.options.map((o, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                  {o.label}
                </span>
              ))}
              {question.allow_etc && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  기타 (직접 입력)
                </span>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onReorderUp} disabled={index === 0} className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
            <button onClick={onReorderDown} disabled={index === total - 1} className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
            <button onClick={onEdit} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">수정</button>
            <button onClick={onToggle} className={`text-xs px-2 py-1 rounded ${question.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {question.active ? '활성' : '비활성'}
            </button>
            <button onClick={onDelete} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}
