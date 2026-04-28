// 관리자 사이드바 네비게이션 스키마 (데이터 기반 렌더링)
//
// 메뉴 추가/이동/라벨 변경 시 이 파일만 수정하면 사이드바에 즉시 반영됨.
// type === 'group'이면 아코디언 카테고리, type === 'item'이면 단일 링크.
// adminOnly: true 면 admin 권한 사용자에게만 노출.

export type AdminNavItem = {
  type: 'item';
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

export type AdminNavGroup = {
  type: 'group';
  id: string;            // 아코디언 상태 + 사용자 커스터마이징 키
  label: string;
  icon: string;
  children: AdminNavItem[];
  adminOnly?: boolean;
};

export type AdminNavEntry = AdminNavItem | AdminNavGroup;

export const ADMIN_NAV: AdminNavEntry[] = [
  {
    type: 'item',
    href: '/admin-cloocus-mkt/events',
    label: '이벤트 등록',
    icon: '📅',
  },
  {
    type: 'group',
    id: 'dashboard',
    label: '대시보드',
    icon: '📊',
    children: [
      { type: 'item', href: '/admin-cloocus-mkt',                   label: '통합 대시보드', icon: '📈' },
      { type: 'item', href: '/admin-cloocus-mkt/survey-responses',  label: '설문 대시보드', icon: '📊' },
      { type: 'item', href: '/admin-cloocus-mkt/certificates',      label: '수료증 대시보드', icon: '🎓' },
    ],
  },
  {
    type: 'group',
    id: 'customers',
    label: '고객 관리',
    icon: '👥',
    children: [
      { type: 'item', href: '/admin-cloocus-mkt/registrations', label: '등록 리스트',  icon: '📋' },
      { type: 'item', href: '/admin-cloocus-mkt/survey-list',   label: '설문 리스트',  icon: '📑' },
      { type: 'item', href: '/admin-cloocus-mkt/emails',        label: '이메일 발송',  icon: '✉️' },
      { type: 'item', href: '/admin-cloocus-mkt/inquiries',     label: 'Q&A',         icon: '💬' },
    ],
  },
  {
    type: 'group',
    id: 'pages',
    label: '페이지 관리',
    icon: '🛠️',
    children: [
      { type: 'item', href: '/admin-cloocus-mkt/form',    label: '등록 폼', icon: '📝' },
      { type: 'item', href: '/admin-cloocus-mkt/surveys', label: '설문 폼', icon: '📄' },
      { type: 'item', href: '/admin-cloocus-mkt/faqs',    label: 'FAQ',    icon: '❓' },
    ],
  },
  {
    type: 'item',
    href: '/admin-cloocus-mkt/users',
    label: '사용자 관리',
    icon: '👤',
    adminOnly: true,
  },
];

// 하단 고정 (휴지통)
export const ADMIN_NAV_FOOTER: AdminNavItem = {
  type: 'item',
  href: '/admin-cloocus-mkt/trash',
  label: '휴지통',
  icon: '🗑️',
};

/**
 * localStorage에 저장되는 사용자 커스터마이즈 형태
 * - groupOrder: top-level 엔트리 식별자 순서 (item은 href, group은 'group:'+id)
 * - childOrder: 각 group id별 children href 순서
 * - overrides:  엔트리/자식별 라벨/아이콘 덮어쓰기
 */
export type NavCustomization = {
  groupOrder: string[];
  childOrder: Record<string, string[]>;
  overrides: Record<string, { label?: string; icon?: string }>;
};

export const NAV_STORAGE_KEY = 'admin_sidebar_customization_v1';

export const EMPTY_CUSTOMIZATION: NavCustomization = {
  groupOrder: [],
  childOrder: {},
  overrides: {},
};

// 엔트리/자식의 안정 식별자
export function entryKey(e: AdminNavEntry): string {
  return e.type === 'group' ? `group:${e.id}` : e.href;
}
export function itemKey(i: AdminNavItem): string {
  return i.href;
}

export function loadCustomization(): NavCustomization {
  if (typeof window === 'undefined') return EMPTY_CUSTOMIZATION;
  try {
    const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return EMPTY_CUSTOMIZATION;
    const parsed = JSON.parse(raw);
    return {
      groupOrder: Array.isArray(parsed.groupOrder) ? parsed.groupOrder : [],
      childOrder: parsed.childOrder && typeof parsed.childOrder === 'object' ? parsed.childOrder : {},
      overrides:  parsed.overrides  && typeof parsed.overrides  === 'object' ? parsed.overrides  : {},
    };
  } catch {
    return EMPTY_CUSTOMIZATION;
  }
}

export function saveCustomization(c: NavCustomization) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(c));
  } catch { /* noop */ }
}

export function clearCustomization() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(NAV_STORAGE_KEY);
  } catch { /* noop */ }
}

// 커스터마이즈 적용된 메뉴 트리 반환
export function applyCustomization(c: NavCustomization): AdminNavEntry[] {
  const base = ADMIN_NAV;
  const byKey = new Map<string, AdminNavEntry>(base.map((e) => [entryKey(e), e]));

  // 1) top-level 순서 결정
  const orderedKeys = c.groupOrder.length > 0
    ? [...c.groupOrder.filter((k) => byKey.has(k)), ...base.map(entryKey).filter((k) => !c.groupOrder.includes(k))]
    : base.map(entryKey);

  return orderedKeys.map((k) => {
    const e = byKey.get(k)!;
    const ov = c.overrides[k] || {};

    if (e.type === 'item') {
      return {
        ...e,
        label: ov.label ?? e.label,
        icon:  ov.icon  ?? e.icon,
      };
    }

    // group: children 순서/오버라이드
    const childByHref = new Map(e.children.map((ch) => [ch.href, ch]));
    const savedChildOrder = c.childOrder[e.id] || [];
    const orderedChildHrefs = savedChildOrder.length > 0
      ? [...savedChildOrder.filter((h) => childByHref.has(h)), ...e.children.map((ch) => ch.href).filter((h) => !savedChildOrder.includes(h))]
      : e.children.map((ch) => ch.href);

    const groupOv = c.overrides[entryKey(e)] || {};

    return {
      ...e,
      label: groupOv.label ?? e.label,
      icon:  groupOv.icon  ?? e.icon,
      children: orderedChildHrefs.map((h) => {
        const ch = childByHref.get(h)!;
        const co = c.overrides[itemKey(ch)] || {};
        return { ...ch, label: co.label ?? ch.label, icon: co.icon ?? ch.icon };
      }),
    };
  });
}

// pathname → 어느 그룹에 속한 항목인지 역인덱스 (자동 펼침에 사용)
export function findGroupIdByPath(entries: AdminNavEntry[], path: string | null): string | null {
  if (!path) return null;
  for (const entry of entries) {
    if (entry.type === 'group') {
      const hit = entry.children.find((c) => isPathActive(path, c.href));
      if (hit) return entry.id;
    }
  }
  return null;
}

// 정확 일치 또는 하위 라우트(prefix) 매칭. 단, '/admin-cloocus-mkt' 루트는 정확 일치만 인정해
// 다른 하위 경로가 통합 대시보드를 활성화시키지 않도록 한다.
export function isPathActive(currentPath: string | null, itemHref: string): boolean {
  if (!currentPath) return false;
  if (currentPath === itemHref) return true;
  if (itemHref === '/admin-cloocus-mkt') return false;
  return currentPath.startsWith(itemHref + '/');
}
