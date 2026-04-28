'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { AdminUser } from '@/lib/types';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ADMIN_NAV_FOOTER, isPathActive } from '@/components/admin/adminNav';

type AdminCtx = {
  user: AdminUser | null;
  accessToken: string;
};

const AdminContext = createContext<AdminCtx>({ user: null, accessToken: '' });
export const useAdmin = () => useContext(AdminContext);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin-cloocus-mkt/login';
  const authChecked = useRef(false);

  const checkAuth = useCallback(async () => {
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

  // 라우트 변경 시 모바일 사이드바 자동 닫기
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    editor: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-700',
  };

  const trashActive = isPathActive(pathname || '', ADMIN_NAV_FOOTER.href);
  const settingsHref = '/admin-cloocus-mkt/sidebar-settings';
  const settingsActive = isPathActive(pathname || '', settingsHref);

  return (
    <AdminContext.Provider value={{ user: admin, accessToken }}>
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          aria-label="관리자 사이드바"
          className={`
            fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col h-screen
            transform transition-transform lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* 상단 헤더 */}
          <div className="p-4 border-b border-gray-200 shrink-0 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-lg">Cloocus Admin</h2>
              <p className="text-xs text-gray-500 mt-1">이벤트 관리 시스템</p>
            </div>
            <Link
              href={settingsHref}
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 설정"
              title="사이드바 설정 (라벨/순서 편집)"
              aria-current={settingsActive ? 'page' : undefined}
              className={`shrink-0 mt-0.5 p-1.5 rounded-md transition-colors ${
                settingsActive ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 011.35 0l.7.6a1 1 0 00.95.225l.9-.225a1 1 0 011.213.7l.225.9a1 1 0 00.7.7l.9.225a1 1 0 01.7 1.213l-.225.9a1 1 0 00.225.95l.6.7a1 1 0 010 1.35l-.6.7a1 1 0 00-.225.95l.225.9a1 1 0 01-.7 1.213l-.9.225a1 1 0 00-.7.7l-.225.9a1 1 0 01-1.213.7l-.9-.225a1 1 0 00-.95.225l-.7.6a1 1 0 01-1.35 0l-.7-.6a1 1 0 00-.95-.225l-.9.225a1 1 0 01-1.213-.7l-.225-.9a1 1 0 00-.7-.7l-.9-.225a1 1 0 01-.7-1.213l.225-.9a1 1 0 00-.225-.95l-.6-.7a1 1 0 010-1.35l.6-.7a1 1 0 00.225-.95l-.225-.9a1 1 0 01.7-1.213l.9-.225a1 1 0 00.7-.7l.225-.9a1 1 0 011.213-.7l.9.225a1 1 0 00.95-.225l.7-.6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>

          {/* 메뉴 (스크롤 영역) */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AdminSidebar
              pathname={pathname || ''}
              isAdminRole={admin.role === 'admin'}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>

          {/* 하단 footer: 휴지통(약한 강조) */}
          <Link
            href={ADMIN_NAV_FOOTER.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={trashActive ? 'page' : undefined}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 text-xs border-t border-gray-100 transition-colors
              ${trashActive
                ? 'bg-gray-100 text-gray-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
            `}
          >
            <span aria-hidden="true" className="text-xs">{ADMIN_NAV_FOOTER.icon}</span>
            <span className="truncate">{ADMIN_NAV_FOOTER.label}</span>
          </Link>

          {/* 하단 고정: 사용자 정보 + 로그아웃 (항상 화면 하단) */}
          <div className="shrink-0 border-t border-gray-200 p-4 bg-white">
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
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1"
              aria-label="메뉴 열기"
              aria-expanded={sidebarOpen}
            >
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
