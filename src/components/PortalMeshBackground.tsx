'use client';

import { usePathname } from 'next/navigation';

// 신청자 포탈 Soft Mesh ambient.
// 노출: 홈(/), 로그인 화면(/my, 인증 전 - body.mesh-hide 가 없을 때), /verify/[id]
// 숨김: 등록 페이지(/[slug]), 로그인 후 /my 대시보드(body.mesh-hide 가 붙음)
// 관리자/미리보기 경로는 렌더하지 않음.

export default function PortalMeshBackground() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (pathname.startsWith('/admin-cloocus-mkt')) return null;
  if (pathname.startsWith('/preview')) return null;

  const allowMesh =
    pathname === '/' ||
    pathname === '/my' ||
    pathname.startsWith('/verify/');
  if (!allowMesh) return null;

  return (
    <div className="mesh-bg-portal" aria-hidden="true">
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
      <div className="mesh-blob mesh-blob-4" />
    </div>
  );
}
