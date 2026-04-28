'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useId } from 'react';
import {
  applyCustomization,
  loadCustomization,
  findGroupIdByPath,
  isPathActive,
  NAV_STORAGE_KEY,
  type AdminNavEntry,
  type AdminNavGroup,
  type AdminNavItem,
} from './adminNav';

const OPEN_KEY = 'admin_sidebar_open_section';

type Props = {
  pathname: string;
  isAdminRole: boolean;
  onNavigate?: () => void;     // 모바일에서 링크 클릭 시 사이드바 닫기 등
};

// 단일 leaf 메뉴
function MenuItem({
  item,
  active,
  indent,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  indent?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors
        ${indent ? 'px-3 py-2 ml-1' : 'px-3 py-2.5'}
        ${active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <span aria-hidden="true" className="shrink-0 w-5 text-center">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// 카테고리 + 아코디언 패널
function AccordionSection({
  group,
  pathname,
  isOpen,
  onToggle,
  onNavigate,
}: {
  group: AdminNavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const panelId = useId();
  const hasActiveChild = group.children.some((c) => isPathActive(pathname, c.href));

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${hasActiveChild && !isOpen ? 'text-blue-700' : 'text-gray-700'}
          ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-50'}
        `}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" className="shrink-0 w-5 text-center">{group.icon}</span>
          <span className="truncate">{group.label}</span>
        </span>
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={panelId}
        role="region"
        aria-label={group.label}
        className={`grid transition-[grid-template-rows] duration-200 ease-out
          ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div className="overflow-hidden">
          <div className="pl-4 pt-0.5 space-y-0.5 border-l border-gray-100 ml-4">
            {group.children.map((child) => (
              <MenuItem
                key={child.href}
                item={child}
                active={isPathActive(pathname, child.href)}
                indent
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar({ pathname, isAdminRole, onNavigate }: Props) {
  // localStorage 커스터마이징 적용된 메뉴 로드. 다른 탭/페이지에서 변경 시 storage 이벤트로 갱신
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NAV_STORAGE_KEY) setVersion((v) => v + 1);
    };
    window.addEventListener('storage', onStorage);
    // 같은 탭 내 변경 알림용 커스텀 이벤트
    const onLocal = () => setVersion((v) => v + 1);
    window.addEventListener('admin-nav-changed', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-nav-changed', onLocal);
    };
  }, []);

  const entries = useMemo<AdminNavEntry[]>(() => {
    const c = loadCustomization();
    return applyCustomization(c).filter((e) => !e.adminOnly || isAdminRole);
    // version은 의도적으로 의존성에 포함해 재계산 트리거
  }, [isAdminRole, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // 단일 오픈: 한 번에 한 그룹만 펼침. localStorage에 마지막 상태 저장
  const [openId, setOpenId] = useState<string | null>(null);

  // 초기 1회 + 라우트/메뉴 변경: 현재 경로의 그룹 자동 펼침 → 없으면 localStorage 복원
  useEffect(() => {
    const fromPath = findGroupIdByPath(entries, pathname);
    if (fromPath) {
      setOpenId(fromPath);
      return;
    }
    try {
      const saved = localStorage.getItem(OPEN_KEY);
      if (saved) setOpenId(saved);
    } catch { /* noop */ }
  }, [pathname, entries]);

  const toggleGroup = (id: string) => {
    setOpenId((prev) => {
      const next = prev === id ? null : id;
      try {
        if (next) localStorage.setItem(OPEN_KEY, next);
        else localStorage.removeItem(OPEN_KEY);
      } catch { /* noop */ }
      return next;
    });
  };

  return (
    <nav aria-label="관리자 메인 메뉴" className="px-3 py-3 space-y-1">
      {entries.map((entry) => {
        if (entry.type === 'item') {
          return (
            <MenuItem
              key={entry.href}
              item={entry}
              active={isPathActive(pathname, entry.href)}
              onNavigate={onNavigate}
            />
          );
        }
        return (
          <AccordionSection
            key={entry.id}
            group={entry}
            pathname={pathname}
            isOpen={openId === entry.id}
            onToggle={() => toggleGroup(entry.id)}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
