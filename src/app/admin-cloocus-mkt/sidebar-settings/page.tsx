'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ADMIN_NAV,
  applyCustomization,
  loadCustomization,
  saveCustomization,
  clearCustomization,
  entryKey,
  itemKey,
  type AdminNavEntry,
  type AdminNavGroup,
  type AdminNavItem,
  type NavCustomization,
} from '@/components/admin/adminNav';

function notifyChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('admin-nav-changed'));
}

export default function SidebarSettingsPage() {
  const [entries, setEntries] = useState<AdminNavEntry[]>([]);
  const [editing, setEditing] = useState<{ key: string; label: string; icon: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const dragKey = useRef<string | null>(null);
  const dragOverKey = useRef<string | null>(null);

  // 초기 로드
  useEffect(() => {
    const c = loadCustomization();
    setEntries(applyCustomization(c));
  }, []);

  // entries에서 현재 customization 추출
  const buildCustomization = (next: AdminNavEntry[]): NavCustomization => {
    const groupOrder = next.map(entryKey);
    const childOrder: Record<string, string[]> = {};
    const overrides: Record<string, { label?: string; icon?: string }> = {};

    // base와 비교해 라벨/아이콘이 다르면 override 기록
    const baseByKey = new Map<string, AdminNavEntry>(ADMIN_NAV.map((e) => [entryKey(e), e]));

    for (const e of next) {
      const baseE = baseByKey.get(entryKey(e));
      if (baseE) {
        const ov: { label?: string; icon?: string } = {};
        if (e.label !== baseE.label) ov.label = e.label;
        if (e.icon  !== baseE.icon)  ov.icon  = e.icon;
        if (ov.label || ov.icon) overrides[entryKey(e)] = ov;
      }

      if (e.type === 'group' && baseE && baseE.type === 'group') {
        childOrder[e.id] = e.children.map((ch) => ch.href);
        const baseChildByHref = new Map(baseE.children.map((ch) => [ch.href, ch]));
        for (const ch of e.children) {
          const baseCh = baseChildByHref.get(ch.href);
          if (baseCh) {
            const ov: { label?: string; icon?: string } = {};
            if (ch.label !== baseCh.label) ov.label = ch.label;
            if (ch.icon  !== baseCh.icon)  ov.icon  = ch.icon;
            if (ov.label || ov.icon) overrides[itemKey(ch)] = ov;
          }
        }
      }
    }
    return { groupOrder, childOrder, overrides };
  };

  const persist = (next: AdminNavEntry[]) => {
    setEntries(next);
    saveCustomization(buildCustomization(next));
    notifyChange();
    setDirty(true);
  };

  // 상위 엔트리 reorder
  const onTopDragStart = (key: string) => { dragKey.current = key; };
  const onTopDragEnter = (key: string) => { dragOverKey.current = key; };
  const onTopDragEnd = () => {
    const from = dragKey.current;
    const to = dragOverKey.current;
    dragKey.current = null;
    dragOverKey.current = null;
    if (!from || !to || from === to) return;
    const fromIdx = entries.findIndex((e) => entryKey(e) === from);
    const toIdx = entries.findIndex((e) => entryKey(e) === to);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...entries];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persist(next);
  };

  // 자식 reorder (그룹 내부)
  const onChildDragStart = (groupId: string, href: string) => { dragKey.current = `${groupId}:${href}`; };
  const onChildDragEnter = (groupId: string, href: string) => { dragOverKey.current = `${groupId}:${href}`; };
  const onChildDragEnd = (groupId: string) => {
    const from = dragKey.current;
    const to = dragOverKey.current;
    dragKey.current = null;
    dragOverKey.current = null;
    if (!from || !to || from === to) return;
    const [, fromHref] = from.split(':');
    const [, toHref] = to.split(':');
    const next = entries.map((e) => {
      if (e.type !== 'group' || e.id !== groupId) return e;
      const fromIdx = e.children.findIndex((c) => c.href === fromHref);
      const toIdx = e.children.findIndex((c) => c.href === toHref);
      if (fromIdx < 0 || toIdx < 0) return e;
      const arr = [...e.children];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...e, children: arr };
    });
    persist(next);
  };

  const startEdit = (key: string, label: string, icon: string) => {
    setEditing({ key, label, icon });
  };
  const saveEdit = () => {
    if (!editing) return;
    const { key, label, icon } = editing;
    const newLabel = label.trim();
    if (!newLabel) { setEditing(null); return; }
    const next = entries.map((e) => {
      if (entryKey(e) === key) {
        if (e.type === 'group') return { ...e, label: newLabel, icon };
        return { ...e, label: newLabel, icon };
      }
      if (e.type === 'group') {
        return {
          ...e,
          children: e.children.map((c) => itemKey(c) === key ? { ...c, label: newLabel, icon } : c),
        };
      }
      return e;
    });
    setEditing(null);
    persist(next);
  };

  const handleReset = () => {
    if (!confirm('모든 라벨/아이콘/순서를 기본값으로 초기화하시겠어요?')) return;
    clearCustomization();
    setEntries(applyCustomization(loadCustomization()));
    notifyChange();
    setDirty(false);
  };

  const totalItems = useMemo(() => {
    let n = 0;
    for (const e of entries) {
      n += e.type === 'group' ? e.children.length + 1 : 1;
    }
    return n;
  }, [entries]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">사이드바 설정</h1>
          <p className="text-sm text-gray-500 mt-1">
            상위 카테고리·하위 메뉴의 <strong>순서/라벨/아이콘</strong>을 사용자별로 변경할 수 있어요. 변경 사항은 이 브라우저에만 저장됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin-cloocus-mkt" className="btn-secondary text-sm">완료</Link>
          <button onClick={handleReset} className="btn-danger text-sm">초기화</button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
        ℹ️ 드래그(<span className="font-mono">⠿</span>)로 순서 변경 · "편집" 클릭으로 라벨/아이콘 변경 · 변경 사항은 즉시 사이드바에 반영
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entryKey(entry)}
            draggable
            onDragStart={() => onTopDragStart(entryKey(entry))}
            onDragEnter={() => onTopDragEnter(entryKey(entry))}
            onDragEnd={onTopDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* 상위 행 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-gray-300 cursor-grab active:cursor-grabbing select-none" title="드래그하여 순서 변경">⠿</span>
              {editing?.key === entryKey(entry) ? (
                <>
                  <input
                    type="text"
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    placeholder="🔹"
                    className="w-12 text-center border border-blue-300 rounded px-1 py-1 text-base"
                  />
                  <input
                    type="text"
                    value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                    autoFocus
                    className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm"
                  />
                  <button onClick={saveEdit} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">저장</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700">취소</button>
                </>
              ) : (
                <>
                  <span className="w-7 text-center text-lg">{entry.icon}</span>
                  <span className="font-semibold text-sm flex-1">
                    {entry.label}
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      {entry.type === 'group' ? `· 그룹 (${entry.children.length})` : (entry.adminOnly ? '· admin only' : '· 단일 메뉴')}
                    </span>
                  </span>
                  <button
                    onClick={() => startEdit(entryKey(entry), entry.label, entry.icon)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    편집
                  </button>
                </>
              )}
            </div>

            {/* 하위 children */}
            {entry.type === 'group' && (
              <div className="divide-y divide-gray-50">
                {entry.children.map((child: AdminNavItem) => (
                  <div
                    key={child.href}
                    draggable
                    onDragStart={() => onChildDragStart((entry as AdminNavGroup).id, child.href)}
                    onDragEnter={() => onChildDragEnter((entry as AdminNavGroup).id, child.href)}
                    onDragEnd={() => onChildDragEnd((entry as AdminNavGroup).id)}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-2 pl-10 pr-4 py-2.5 hover:bg-gray-50"
                  >
                    <span className="text-gray-300 cursor-grab active:cursor-grabbing select-none" title="드래그하여 순서 변경">⠿</span>
                    {editing?.key === itemKey(child) ? (
                      <>
                        <input
                          type="text"
                          value={editing.icon}
                          onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                          placeholder="🔹"
                          className="w-12 text-center border border-blue-300 rounded px-1 py-1 text-base"
                        />
                        <input
                          type="text"
                          value={editing.label}
                          onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                          autoFocus
                          className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm"
                        />
                        <button onClick={saveEdit} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">저장</button>
                        <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700">취소</button>
                      </>
                    ) : (
                      <>
                        <span className="w-6 text-center">{child.icon}</span>
                        <span className="text-sm text-gray-700 flex-1">{child.label}</span>
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[180px]" title={child.href}>{child.href}</span>
                        <button
                          onClick={() => startEdit(itemKey(child), child.label, child.icon)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          편집
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        총 {entries.length}개 카테고리 · {totalItems}개 메뉴 항목
        {dirty && <span className="ml-2 text-emerald-600">· 변경사항 자동 저장됨</span>}
      </p>
    </div>
  );
}
