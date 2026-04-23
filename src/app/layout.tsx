import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { isInternalRequest } from "@/lib/internal-ip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "클루커스 이벤트 등록",
  description: "Cloocus 이벤트 등록 시스템",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const suppressAnalytics = isInternalRequest(h);

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet" />
        {suppressAnalytics && (
          <script
            id="internal-traffic-flag"
            dangerouslySetInnerHTML={{ __html: 'window.__INTERNAL_TRAFFIC__=true;' }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics suppress={suppressAnalytics} />
        {children}
      </body>
    </html>
  );
}
