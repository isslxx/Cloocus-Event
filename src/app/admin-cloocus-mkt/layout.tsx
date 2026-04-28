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
          <div className="p-4 border-b border-gray-200 shrink-0">
            <h2 className="font-bold text-lg">Cloocus Admin</h2>
            <p className="text-xs text-gray-500 mt-1">이벤트 관리 시스템</p>
          </div>

          {/* 메뉴 (스크롤 영역) */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AdminSidebar
              pathname={pathname || ''}
              isAdminRole={admin.role === 'admin'}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>

          {/* 하단 footer: 휴지통 + 사이드바 설정 (약한 강조, 동일 레벨) */}
          <div className="shrink-0 border-t border-gray-100 flex">
            <Link
              href={ADMIN_NAV_FOOTER.href}
              onClick={() => setSidebarOpen(false)}
              aria-current={trashActive ? 'page' : undefined}
              className={`flex-1 flex items-center gap-2 px-4 py-2 text-xs transition-colors
                ${trashActive
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
              `}
            >
              <span aria-hidden="true" className="text-xs">{ADMIN_NAV_FOOTER.icon}</span>
              <span className="truncate">{ADMIN_NAV_FOOTER.label}</span>
            </Link>
            <Link
              href={settingsHref}
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 설정"
              title="사이드바 설정 (라벨/순서 편집)"
              aria-current={settingsActive ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs border-l border-gray-100 transition-colors
                ${settingsActive
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
              `}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.425-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>설정</span>
            </Link>
          </div>

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
