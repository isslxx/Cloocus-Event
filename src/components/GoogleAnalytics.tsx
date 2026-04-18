'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const GA_ID = 'G-NHQ22J3WC4';

export default function GoogleAnalytics() {
  const pathname = usePathname();

  // 관리자 페이지에서는 GA 로드 제외
  if (pathname?.startsWith('/admin-cloocus-mkt')) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
