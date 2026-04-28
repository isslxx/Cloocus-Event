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
  id: string;            // 아코디언 상태 저장용 고유 키
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

// pathname → 어느 그룹에 속한 항목인지 역인덱스 (자동 펼침에 사용)
export function findGroupIdByPath(path: string | null): string | null {
  if (!path) return null;
  for (const entry of ADMIN_NAV) {
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
