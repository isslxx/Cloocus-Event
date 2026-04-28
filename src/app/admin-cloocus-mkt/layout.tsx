'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import type { AdminUser } from '@/lib/types';
import AdminSidebar from '@/components/admin/AdminSidebar';

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

  // 로그인 페이지는 레이아웃 무시
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

  return (
    <AdminContext.Provider value={{ user: admin, accessToken }}>
      <div className="min-h-screen flex bg-gray-50">
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
            fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col
            transform transition-transform lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200 shrink-0">
            <h2 className="font-bold text-lg">Cloocus Admin</h2>
            <p className="text-xs text-gray-500 mt-1">이벤트 관리 시스템</p>
          </div>

          {/* 메뉴 */}
          <AdminSidebar
            pathname={pathname || ''}
            isAdminRole={admin.role === 'admin'}
            onNavigate={() => setSidebarOpen(false)}
          />

          {/* 하단 고정: 사용자 정보 + 로그아웃 */}
          <div className="border-t border-gray-200 p-4 shrink-0">
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
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
