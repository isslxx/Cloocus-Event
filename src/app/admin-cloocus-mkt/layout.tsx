'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import type { AdminUser } from '@/lib/types';
import Link from 'next/link';

type AdminCtx = {
  user: AdminUser | null;
  accessToken: string;
};

const AdminContext = createContext<AdminCtx>({ user: null, accessToken: '' });
export const useAdmin = () => useContext(AdminContext);

type NavItem = { href: string; label: string; icon: string };

const DEFAULT_NAV: NavItem[] = [
  { href: '/admin-cloocus-mkt', label: '대시보드', icon: '📊' },
  { href: '/admin-cloocus-mkt/registrations', label: '등록 리스트', icon: '📋' },
  { href: '/admin-cloocus-mkt/form', label: '등록 페이지 관리', icon: '📝' },
  { href: '/admin-cloocus-mkt/events', label: '이벤트 관리', icon: '📅' },
  { href: '/admin-cloocus-mkt/emails', label: '이메일 발송', icon: '✉️' },
  { href: '/admin-cloocus-mkt/faqs', label: 'FAQ 관리', icon: '❓' },
];

function loadNavOrder(): NavItem[] {
  if (typeof window === 'undefined') return DEFAULT_NAV;
  try {
    const saved = localStorage.getItem('admin_nav_order');
    if (!saved) return DEFAULT_NAV;
    const parsed = JSON.parse(saved) as NavItem[];
    // 새로 추가된 메뉴가 있을 수 있으므로 병합
    const savedHrefs = new Set(parsed.map((n) => n.href));
    const merged = [...parsed];
    for (const item of DEFAULT_NAV) {
      if (!savedHrefs.has(item.href)) merged.push(item);
    }
    // 삭제된 메뉴 제거
    const defaultHrefs = new Set(DEFAULT_NAV.map((n) => n.href));
    return merged.filter((n) => defaultHrefs.has(n.href));
  } catch {
    return DEFAULT_NAV;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 사이드바 편집 모드
  const [editMode, setEditMode] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    setNavItems(loadNavOrder());
  }, []);

  const saveNavOrder = (items: NavItem[]) => {
    setNavItems(items);
    localStorage.setItem('admin_nav_order', JSON.stringify(items));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...navItems];
    const dragged = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    saveNavOrder(items);
  };

  const handleLabelSave = (href: string) => {
    if (!editLabelValue.trim()) { setEditingLabel(null); return; }
    const items = navItems.map((n) => n.href === href ? { ...n, label: editLabelValue.trim() } : n);
    saveNavOrder(items);
    setEditingLabel(null);
  };

  const resetNav = () => {
    localStorage.removeItem('admin_nav_order');
    setNavItems(DEFAULT_NAV);
    setEditMode(false);
  };

  // 로그인 페이지는 레이아웃 무시
  const isLoginPage = pathname === '/admin-cloocus-mkt/login';

  const authChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    // 이미 인증 완료된 상태면 스킵
    if (authChecked.current && admin && accessToken) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (!isLoginPage) router.push('/admin-cloocus-mkt/login');
      setLoading(false);
      return;
    }

    setAccessToken(session.access_token);

    // 이미 admin 정보가 있고 같은 유저면 DB 재조회 스킵
    if (admin && admin.id === session.user.id) {
      authChecked.current = true;
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!data) {
      await supabase.auth.signOut();
      if (!isLoginPage) router.push('/admin-cloocus-mkt/login');
      setLoading(false);
      return;
    }

    setAdmin(data as AdminUser);
    authChecked.current = true;
    setLoading(false);
  }, [isLoginPage, router, admin, accessToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push('/admin-cloocus-mkt/login');
  };

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!admin) return null;

  const allNavItems = [
    ...navItems,
    ...(admin.role === 'admin' ? [{ href: '/admin-cloocus-mkt/users', label: '사용자 관리', icon: '👤' }] : []),
  ];

  const bottomNavItem = { href: '/admin-cloocus-mkt/trash', label: '휴지통', icon: '🗑️' };

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    editor: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-700',
  };

  return (
    <AdminContext.Provider value={{ user: admin, accessToken }}>
      <div className="min-h-screen flex bg-gray-50">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200
          transform transition-transform lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-lg">Cloocus Admin</h2>
            <p className="text-xs text-gray-500 mt-1">이벤트 관리 시스템</p>
          </div>

          <div className="flex items-center justify-end px-4 pt-3 pb-1">
            <button
              onClick={() => { if (editMode) setEditMode(false); else setEditMode(true); setEditingLabel(null); }}
              className={`text-xs px-2 py-0.5 rounded ${editMode ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          </div>

          <nav className="px-3 pb-3 space-y-1">
            {allNavItems.map((item, index) => {
              const isAdminOnly = item.href === '/admin-cloocus-mkt/users';
              const isDraggable = editMode && !isAdminOnly;

              if (editMode && editingLabel === item.href) {
                return (
                  <div key={item.href} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                    <span>{item.icon}</span>
                    <input
                      type="text"
                      value={editLabelValue}
                      onChange={(e) => setEditLabelValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLabelSave(item.href); if (e.key === 'Escape') setEditingLabel(null); }}
                      onBlur={() => handleLabelSave(item.href)}
                      className="flex-1 text-sm border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                );
              }

              return (
                <div
                  key={item.href}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? () => handleDragStart(index) : undefined}
                  onDragEnter={isDraggable ? () => handleDragEnter(index) : undefined}
                  onDragEnd={isDraggable ? handleDragEnd : undefined}
                  onDragOver={isDraggable ? (e) => e.preventDefault() : undefined}
                  className="flex items-center gap-1"
                >
                  {isDraggable && (
                    <span className="text-gray-300 cursor-grab active:cursor-grabbing text-xs px-0.5" title="드래그하여 순서 변경">⠿</span>
                  )}
                  <Link
                    href={editMode ? '#' : item.href}
                    onClick={(e) => {
                      if (editMode) {
                        e.preventDefault();
                        setEditingLabel(item.href);
                        setEditLabelValue(item.label);
                      } else {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      !editMode && pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : editMode
                          ? 'text-gray-600 hover:bg-yellow-50 cursor-text'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              );
            })}
            {editMode && (
              <button onClick={resetNav} className="w-full text-[10px] text-gray-400 hover:text-red-500 py-1 mt-1">
                순서/이름 초기화
              </button>
            )}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200">
            <Link
              href={bottomNavItem.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                pathname === bottomNavItem.href
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs">{bottomNavItem.icon}</span>
              {bottomNavItem.label}
            </Link>
            <div className="p-4 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                  {admin.display_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{admin.display_name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${roleBadge[admin.role]}`}>
                    {admin.role}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-secondary w-full text-xs">
                로그아웃
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-semibold">Cloocus Admin</span>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
