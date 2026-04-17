'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdmin } from '../layout';
import type { FAQ, FAQCategory } from '@/lib/types';

export default function FaqsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 편집 모드 (드래그)
  const [editMode, setEditMode] = useState(false);

  // FAQ 모달
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // 카테고리 모달
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [catFormName, setCatFormName] = useState('');
  const [catFormIcon, setCatFormIcon] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // 삭제 확인
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 카테고리 이동 드롭다운
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);

  // 리치 텍스트 에디터
  const answerEditorRef = useRef<HTMLDivElement>(null);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    answerEditorRef.current?.focus();
  };

  // 드래그 앤 드롭 (FAQ)
  const dragFaqItem = useRef<{ id: string; catId: string | null } | null>(null);
  const dragOverFaqItem = useRef<{ id: string; catId: string | null } | null>(null);

  // 드래그 앤 드롭 (카테고리)
  const dragCatItem = useRef<number | null>(null);
  const dragOverCatItem = useRef<number | null>(null);

  const isAdmin = admin?.role === 'admin';
  const isEditable = admin?.role !== 'viewer';

  const fetchData = useCallback(async () => {
    try {
      const [faqRes, catRes] = await Promise.all([
        fetch('/api/admin/faqs', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/faq-categories', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const faqData = await faqRes.json();
      const catData = await catRes.json();
      setFaqs(Array.isArray(faqData) ? faqData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchData();
  }, [accessToken, fetchData]);

  // 체크박스
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === faqs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(faqs.map((f) => f.id)));
  };

  // 일괄 활성/비활성
  const bulkToggle = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/admin/faqs/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ids: [...selectedIds], updates: { active } }),
      });
      setSelectedIds(new Set());
      fetchData();
    } catch { /* ignore */ }
  };

  // 카테고리 이동
  const bulkMove = async (categoryId: string | null) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/admin/faqs/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ids: [...selectedIds], updates: { category_id: categoryId } }),
      });
      setSelectedIds(new Set());
      setShowMoveDropdown(false);
      fetchData();
    } catch { /* ignore */ }
  };

  // 일괄 삭제
  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/admin/faqs/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      setSelectedIds(new Set());
      setBulkDeleting(false);
      fetchData();
    } catch { /* ignore */ }
  };

  // FAQ CRUD
  const openNewFaq = (categoryId?: string) => {
    setIsNew(true);
    setEditing(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormSortOrder(faqs.length + 1);
    setFormActive(true);
    setFormCategoryId(categoryId || '');
    setTimeout(() => { if (answerEditorRef.current) answerEditorRef.current.innerHTML = ''; }, 0);
  };

  const openEditFaq = (faq: FAQ) => {
    setIsNew(false);
    setEditing(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSortOrder(faq.sort_order);
    setFormActive(faq.active);
    setFormCategoryId(faq.category_id || '');
    setTimeout(() => { if (answerEditorRef.current) answerEditorRef.current.innerHTML = faq.answer; }, 0);
  };

  const handleSaveFaq = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const body = {
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        sort_order: formSortOrder,
        active: formActive,
        category_id: formCategoryId || null,
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
      fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDeleting(null);
      fetchData();
    } catch { /* ignore */ }
  };

  // 카테고리 CRUD
  const openNewCategory = () => {
    setIsNewCategory(true);
    setEditingCategory(null);
    setCatFormName('');
    setCatFormIcon('📌');
  };

  const openEditCategory = (cat: FAQCategory) => {
    setIsNewCategory(false);
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormIcon(cat.icon);
  };

  const handleSaveCategory = async () => {
    if (!catFormName.trim()) return;
    setCatSaving(true);
    try {
      const body = { name: catFormName.trim(), icon: catFormIcon, sort_order: isNewCategory ? categories.length + 1 : editingCategory?.sort_order };
      if (isNewCategory) {
        await fetch('/api/admin/faq-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (editingCategory) {
        await fetch(`/api/admin/faq-categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      setEditingCategory(null);
      setIsNewCategory(false);
      fetchData();
    } catch { /* ignore */ }
    finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await fetch(`/api/admin/faq-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDeletingCategory(null);
      fetchData();
    } catch { /* ignore */ }
  };

  // 카테고리 드래그
  const handleCatDragStart = (index: number) => { dragCatItem.current = index; };
  const handleCatDragEnter = (index: number) => { dragOverCatItem.current = index; };
  const handleCatDragEnd = async () => {
    if (dragCatItem.current === null || dragOverCatItem.current === null) return;
    const items = [...categories];
    const dragged = items.splice(dragCatItem.current, 1)[0];
    items.splice(dragOverCatItem.current, 0, dragged);
    dragCatItem.current = null;
    dragOverCatItem.current = null;
    const reordered = items.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCategories(reordered);
    // 서버 저장
    for (const c of reordered) {
      await fetch(`/api/admin/faq-categories/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ sort_order: c.sort_order }),
      });
    }
  };

  // FAQ 드래그 (카테고리 내 + 카테고리 간 이동)
  const handleFaqDragStart = (id: string, catId: string | null) => {
    dragFaqItem.current = { id, catId };
  };
  const handleFaqDragEnter = (id: string, catId: string | null) => {
    dragOverFaqItem.current = { id, catId };
  };
  const handleFaqDragEnd = async () => {
    const from = dragFaqItem.current;
    const to = dragOverFaqItem.current;
    if (!from || !to || from.id === to.id) {
      dragFaqItem.current = null;
      dragOverFaqItem.current = null;
      return;
    }

    const items = [...faqs];
    const fromIdx = items.findIndex((f) => f.id === from.id);
    const toIdx = items.findIndex((f) => f.id === to.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const dragged = items.splice(fromIdx, 1)[0];
    // 카테고리 간 이동
    dragged.category_id = to.catId;
    items.splice(toIdx, 0, dragged);

    // sort_order 재계산
    const reorder = items.map((f, i) => ({ id: f.id, sort_order: i + 1, category_id: f.category_id }));
    setFaqs(items.map((f, i) => ({ ...f, sort_order: i + 1 })));

    dragFaqItem.current = null;
    dragOverFaqItem.current = null;

    await fetch('/api/admin/faqs/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reorder }),
    });
  };

  // 카테고리별 FAQ 그룹핑
  const categoryIds = new Set(categories.map((c) => c.id));
  const getFaqsByCategory = (catId: string | null) => {
    if (catId === null) {
      // 미분류: category_id가 null/undefined이거나 존재하지 않는 카테고리
      return faqs
        .filter((f) => !f.category_id || !categoryIds.has(f.category_id))
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return faqs
      .filter((f) => f.category_id === catId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const uncategorizedFaqs = getFaqsByCategory(null);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">FAQ 관리</h1>
        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              onClick={() => { setEditMode(!editMode); setSelectedIds(new Set()); }}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                editMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
          {isEditable && (
            <button onClick={() => openNewCategory()} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              + 카테고리
            </button>
          )}
          {isEditable && (
            <button onClick={() => openNewFaq()} className="btn-primary text-sm">
              + FAQ 추가
            </button>
          )}
        </div>
      </div>

      {/* 선택 시 일괄 처리 바 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size}개 선택됨
          </span>
          <div className="flex gap-2 items-center">
            {/* 카테고리 이동 */}
            <div className="relative">
              <button
                onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
              >
                카테고리 이동 ▾
              </button>
              {showMoveDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoveDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      onClick={() => bulkMove(null)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      📂 미분류
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => bulkMove(cat.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        {cat.icon || '📌'} {cat.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => bulkToggle(true)} className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
              활성화
            </button>
            <button onClick={() => bulkToggle(false)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">
              비활성화
            </button>
            {isAdmin && (
              <button onClick={() => setBulkDeleting(true)} className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium">
                일괄 삭제
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : (
        <div className="space-y-4">
          {/* 전체 선택 */}
          {faqs.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={selectedIds.size === faqs.length && faqs.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-xs text-gray-500">전체 선택 ({faqs.length})</span>
            </div>
          )}

          {/* 카테고리별 그룹 */}
          {categories.map((cat, catIndex) => {
            const catFaqs = getFaqsByCategory(cat.id);
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                draggable={editMode}
                onDragStart={editMode ? () => handleCatDragStart(catIndex) : undefined}
                onDragEnter={editMode ? () => handleCatDragEnter(catIndex) : undefined}
                onDragEnd={editMode ? handleCatDragEnd : undefined}
                onDragOver={editMode ? (e) => e.preventDefault() : undefined}
              >
                {/* 카테고리 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <span className="text-gray-300 cursor-grab active:cursor-grabbing text-sm" title="드래그하여 순서 변경">⠿</span>
                    )}
                    <span className="text-base">{cat.icon || '📌'}</span>
                    <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{catFaqs.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditable && (
                      <button onClick={() => openNewFaq(cat.id)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                        + 추가
                      </button>
                    )}
                    {isEditable && (
                      <button onClick={() => openEditCategory(cat)} className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">
                        수정
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => setDeletingCategory(cat.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                {/* FAQ 목록 */}
                {catFaqs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">이 카테고리에 FAQ가 없습니다.</div>
                ) : (
                  <div>
                    {catFaqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                        draggable={editMode}
                        onDragStart={editMode ? () => handleFaqDragStart(faq.id, cat.id) : undefined}
                        onDragEnter={editMode ? () => handleFaqDragEnter(faq.id, cat.id) : undefined}
                        onDragEnd={editMode ? handleFaqDragEnd : undefined}
                        onDragOver={editMode ? (e) => e.preventDefault() : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(faq.id)}
                          onChange={() => toggleSelect(faq.id)}
                          className="w-4 h-4 accent-blue-600 shrink-0"
                        />
                        {editMode && (
                          <span className="text-gray-300 cursor-grab active:cursor-grabbing text-xs shrink-0">⠿</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{faq.question}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{faq.answer}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          faq.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {faq.active ? '활성' : '비활성'}
                        </span>
                        {isEditable && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditFaq(faq)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                              수정
                            </button>
                            {isAdmin && (
                              <button onClick={() => setDeleting(faq.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
                                삭제
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 미분류 FAQ */}
          {uncategorizedFaqs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-base">📂</span>
                  <span className="text-sm font-semibold text-gray-500">미분류</span>
                  <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{uncategorizedFaqs.length}</span>
                </div>
              </div>
              <div>
                {uncategorizedFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                    draggable={editMode}
                    onDragStart={editMode ? () => handleFaqDragStart(faq.id, null) : undefined}
                    onDragEnter={editMode ? () => handleFaqDragEnter(faq.id, null) : undefined}
                    onDragEnd={editMode ? handleFaqDragEnd : undefined}
                    onDragOver={editMode ? (e) => e.preventDefault() : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(faq.id)}
                      onChange={() => toggleSelect(faq.id)}
                      className="w-4 h-4 accent-blue-600 shrink-0"
                    />
                    {editMode && (
                      <span className="text-gray-300 cursor-grab active:cursor-grabbing text-xs shrink-0">⠿</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{faq.question}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{faq.answer}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      faq.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {faq.active ? '활성' : '비활성'}
                    </span>
                    {isEditable && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditFaq(faq)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                          수정
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleting(faq.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
                            삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {faqs.length === 0 && categories.length === 0 && (
            <div className="text-center py-12 text-gray-400">등록된 FAQ가 없습니다. 카테고리를 추가하고 FAQ를 등록해보세요.</div>
          )}
        </div>
      )}

      {/* FAQ 추가/수정 모달 */}
      {(isNew || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{isNew ? 'FAQ 추가' : 'FAQ 수정'}</h2>
            <div className="space-y-4">
              <div className="field">
                <label>카테고리</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  <option value="">미분류</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
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
                <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-300">
                  {/* 툴바 */}
                  <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm font-bold" title="굵게">B</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm italic" title="기울임">I</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm underline" title="밑줄">U</button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', '#2563eb'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs" title="파란색">
                      <span className="text-blue-600 font-bold">A</span>
                    </button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', '#dc2626'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs" title="빨간색">
                      <span className="text-red-600 font-bold">A</span>
                    </button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', '#16a34a'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs" title="초록색">
                      <span className="text-green-600 font-bold">A</span>
                    </button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', '#000000'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs" title="검정색">
                      <span className="text-black font-bold">A</span>
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs text-gray-500" title="서식 제거">
                      T̶
                    </button>
                  </div>
                  {/* 에디터 */}
                  <div
                    ref={answerEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      if (answerEditorRef.current) setFormAnswer(answerEditorRef.current.innerHTML);
                    }}
                    dangerouslySetInnerHTML={{ __html: formAnswer }}
                    className="min-h-[120px] px-3 py-2 text-sm leading-relaxed focus:outline-none"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
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
              <button onClick={handleSaveFaq} disabled={saving} className="btn-primary flex-1">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary flex-1">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 추가/수정 모달 */}
      {(isNewCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">{isNewCategory ? '카테고리 추가' : '카테고리 수정'}</h2>
            <div className="space-y-4">
              <div className="field">
                <label>아이콘</label>
                <input
                  type="text"
                  value={catFormIcon}
                  onChange={(e) => setCatFormIcon(e.target.value)}
                  placeholder="📌"
                  className="text-center"
                  style={{ fontSize: 20 }}
                />
              </div>
              <div className="field">
                <label>카테고리 이름</label>
                <input
                  type="text"
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="예: 등록/참여"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSaveCategory} disabled={catSaving} className="btn-primary flex-1">
                {catSaving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => { setEditingCategory(null); setIsNewCategory(false); }} className="btn-secondary flex-1">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ 삭제 확인 */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">FAQ 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">이 FAQ를 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteFaq(deleting)} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 삭제 확인 */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">카테고리 삭제</h2>
            <p className="text-gray-500 text-sm mb-2">이 카테고리를 삭제하시겠습니까?</p>
            <p className="text-xs text-gray-400 mb-6">카테고리에 속한 FAQ는 미분류로 이동됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteCategory(deletingCategory)} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setDeletingCategory(null)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 */}
      {bulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold mb-2">일괄 삭제</h2>
            <p className="text-gray-500 text-sm mb-6">선택한 {selectedIds.size}개의 FAQ를 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={bulkDelete} className="btn-danger flex-1">삭제</button>
              <button onClick={() => setBulkDeleting(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
