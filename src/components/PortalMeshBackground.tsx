'use client';

import { usePathname } from 'next/navigation';

// 신청자 포탈 (홈, 등록 페이지, /my, /verify) 전체에 깔리는 Soft Mesh ambient.
// 관리자 경로(/admin-cloocus-mkt)에서는 렌더하지 않음.
// position: fixed 로 viewport 기준에 고정되어 스크롤해도 항상 보임.

export default function PortalMeshBackground() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin-cloocus-mkt')) return null;

  return (
    <div className="mesh-bg-portal" aria-hidden="true">
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
      <div className="mesh-blob mesh-blob-4" />
    </div>
  );
}
