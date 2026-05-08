'use client';

// 임시 미리보기 — Premium AI SaaS 다크 ambient 배경 시안.
// 사용자가 적용 결정하면 홈 페이지에 반영 + 미리보기 페이지 삭제.

import { useState } from 'react';

type CardStyle = 'glass' | 'white';

type SampleEvent = {
  id: string;
  category: '세미나' | '프로모션' | '워크샵' | '스프린트';
  name: string;
  summary: string;
  date: string;
  type: 'online' | 'offline';
  capacity?: number;
};

const SAMPLES: SampleEvent[] = [
  { id: '1', category: '세미나', name: 'Copilot Hands-on Labs', summary: '현업 개발자와 함께 실무 코드베이스에 GitHub Copilot 을 적용해보는 체험 워크숍', date: '2026.05.22(금)', type: 'offline', capacity: 20 },
  { id: '2', category: '프로모션', name: 'Gemini Enterprise 견적 문의', summary: '조직 규모와 사용 시나리오에 맞춰 1:1 컨설팅과 견적을 제공합니다', date: '2026.06.30(화)까지', type: 'online' },
  { id: '3', category: '워크샵', name: 'Azure 클라우드 인프라 입문', summary: '클라우드 처음 도입하는 팀을 위한 핵심 개념과 베스트 프랙티스 워크숍', date: '07.15(수)-07.16(목)', type: 'offline', capacity: 30 },
];

export default function AmbientBgPreview() {
  const [cardStyle, setCardStyle] = useState<CardStyle>('glass');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="ai-bg -mx-4 lg:-mx-8 -my-6 lg:-my-8">
      {/* 안내 + 카드 스타일 토글 */}
      <div className="ai-banner sticky top-0 z-50 flex items-center gap-3 px-5 py-2.5 text-xs">
        <span className="font-medium text-white">Premium AI SaaS Ambient BG 미리보기</span>
        <span className="opacity-60 text-white">deep navy + aurora mesh</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="opacity-70 text-white">카드:</span>
          {(['glass', 'white'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setCardStyle(s)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition ${cardStyle === s ? 'bg-white text-slate-900 font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {s === 'glass' ? 'Glass (다크)' : 'White (라이트)'}
            </button>
          ))}
        </span>
      </div>

      {/* Aurora mesh 배경 레이어 */}
      <div className="ai-aurora" aria-hidden="true">
        <div className="ai-blob ai-blob-1" />
        <div className="ai-blob ai-blob-2" />
        <div className="ai-blob ai-blob-3" />
        <div className="ai-blob ai-blob-4" />
        <div className="ai-center-glow" />
        <div className="ai-grain" />
      </div>

      {/* 콘텐츠 — 실제 홈 레이아웃 재현 */}
      <div className="relative z-[1] min-h-[calc(100vh-40px)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-2xl">
            <div className={cardStyle === 'glass' ? 'ai-container ai-container-glass' : 'ai-container ai-container-white'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className={`h-7 mx-auto mb-5 ${cardStyle === 'glass' ? 'invert opacity-90' : ''}`} />
              <h1 className={`text-2xl font-bold text-center mb-2 ${cardStyle === 'glass' ? 'text-white' : 'text-gray-900'}`}>
                클루커스 이벤트
              </h1>
              <p className={`text-center mb-8 ${cardStyle === 'glass' ? 'text-slate-300' : 'text-gray-500'}`}>
                참여하실 이벤트를 선택해주세요.
              </p>

              <div className="space-y-3">
                {SAMPLES.map((event) => (
                  <SampleCard
                    key={event.id}
                    event={event}
                    isSelected={selectedId === event.id}
                    onSelect={() => setSelectedId(event.id)}
                    cardStyle={cardStyle}
                  />
                ))}
              </div>

              <button className="ai-cta w-full mt-6" disabled={!selectedId}>
                <span>이벤트 등록하기</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <p className={`w-full mt-3 text-sm text-center ${cardStyle === 'glass' ? 'text-slate-400' : 'text-gray-400'}`}>
                등록 정보 조회ㅣ신청자 포털
              </p>
            </div>
          </div>
        </div>

        <footer className="relative z-[1] py-4 px-4 text-center">
          <p className={`text-[10px] ${cardStyle === 'glass' ? 'text-slate-500' : 'text-gray-400'}`}>
            (주)클루커스 · 미리보기 화면 · marketing@cloocus.com
          </p>
        </footer>
      </div>

      <Styles />
    </div>
  );
}

const TINTS: Record<string, { fg: string; bg: string; glow: string }> = {
  세미나: { fg: '#a78bfa', bg: 'rgba(167, 139, 250, 0.16)', glow: 'rgba(139, 92, 246, 0.4)' },
  프로모션: { fg: '#34d399', bg: 'rgba(52, 211, 153, 0.16)', glow: 'rgba(16, 185, 129, 0.4)' },
  워크샵: { fg: '#22d3ee', bg: 'rgba(34, 211, 238, 0.16)', glow: 'rgba(6, 182, 212, 0.4)' },
  스프린트: { fg: '#fb923c', bg: 'rgba(251, 146, 60, 0.16)', glow: 'rgba(249, 115, 22, 0.4)' },
};

function SampleCard({ event, isSelected, onSelect, cardStyle }: {
  event: SampleEvent;
  isSelected: boolean;
  onSelect: () => void;
  cardStyle: CardStyle;
}) {
  const tint = TINTS[event.category];
  const klass = cardStyle === 'glass' ? 'ai-card ai-card-glass' : 'ai-card ai-card-white';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${klass} ${isSelected ? 'is-selected' : ''} relative w-full text-left`}
      style={{ '--tint-fg': tint.fg, '--tint-bg': tint.bg, '--tint-glow': tint.glow } as React.CSSProperties}
    >
      <span className="ai-card-border" aria-hidden="true" />
      <div className="relative z-[2] flex items-stretch gap-3.5 p-4">
        <div className="shrink-0 flex items-start pt-0.5">
          <div className="ai-card-icon">
            <CategoryIcon category={event.category} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="ai-card-category">{event.category}</div>
          <h3 className="ai-card-title">{event.name}</h3>
          <p className="ai-card-summary">{event.summary}</p>
          <div className="ai-card-meta">
            <CalendarIcon /> <span>{event.date}</span>
            <span className="ai-card-meta-dot">·</span>
            <span>{event.type === 'online' ? 'Online' : 'Offline'}</span>
            {event.capacity && (
              <>
                <span className="ai-card-meta-dot">·</span>
                <span>정원 {event.capacity}명</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 self-center">
          <NeuralFlow />
        </div>
      </div>
    </button>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const c = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (category === '세미나') return <svg {...c}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
  if (category === '프로모션') return <svg {...c}><path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.5L12 14.6 6 17.2l1-5.5-4-3.9 5.5-.8z" /></svg>;
  if (category === '워크샵') return <svg {...c}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
  return <svg {...c}><polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" /></svg>;
}

function CalendarIcon() {
  return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
}

function NeuralFlow() {
  return (
    <svg viewBox="0 0 64 64" className="ai-card-ambient" preserveAspectRatio="xMidYMid meet">
      <path d="M0 22 Q 16 14, 32 22 T 64 22" stroke="var(--tint-fg)" strokeOpacity="0.35" strokeWidth="0.7" fill="none" />
      <path d="M0 32 Q 20 38, 32 32 T 64 32" stroke="var(--tint-fg)" strokeOpacity="0.55" strokeWidth="0.8" fill="none" />
      <path d="M0 42 Q 18 50, 32 42 T 64 42" stroke="var(--tint-fg)" strokeOpacity="0.35" strokeWidth="0.7" fill="none" />
      <circle r="1.6" cx="0" cy="32" className="ai-pulse">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M0 0 Q 20 6, 32 0 T 64 0" />
      </circle>
      <circle r="1.2" cx="0" cy="22" className="ai-pulse">
        <animateMotion dur="5.5s" repeatCount="indefinite" begin="-1.5s" path="M0 0 Q 16 -8, 32 0 T 64 0" />
      </circle>
    </svg>
  );
}

// ============================================================
// 스타일
// ============================================================
function Styles() {
  return (
    <style jsx global>{`
      /* ==============================================================
         배경 — Deep navy + aurora mesh
      ============================================================== */
      .ai-bg {
        position: relative;
        min-height: 100vh;
        background:
          radial-gradient(1200px 800px at 50% -200px, #0d1228 0%, transparent 60%),
          linear-gradient(180deg, #060816 0%, #050714 50%, #060816 100%);
        overflow: hidden;
        color: #e2e8f0;
      }

      .ai-banner {
        background: rgba(6, 8, 22, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .ai-aurora {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }

      /* 4개의 큰 블롭이 천천히 떠다니는 mesh */
      .ai-blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.55;
        will-change: transform;
      }
      .ai-blob-1 {
        width: 60vw; height: 60vw;
        max-width: 900px; max-height: 900px;
        top: -10%;
        left: -15%;
        background: radial-gradient(circle, #5B8CFF 0%, transparent 70%);
        animation: ai-blob-1-float 22s ease-in-out infinite;
      }
      .ai-blob-2 {
        width: 50vw; height: 50vw;
        max-width: 800px; max-height: 800px;
        top: 20%;
        right: -20%;
        background: radial-gradient(circle, #7B61FF 0%, transparent 70%);
        animation: ai-blob-2-float 26s ease-in-out infinite;
      }
      .ai-blob-3 {
        width: 55vw; height: 55vw;
        max-width: 850px; max-height: 850px;
        bottom: -25%;
        left: 10%;
        background: radial-gradient(circle, #00C2FF 0%, transparent 70%);
        opacity: 0.4;
        animation: ai-blob-3-float 24s ease-in-out infinite;
      }
      .ai-blob-4 {
        width: 40vw; height: 40vw;
        max-width: 600px; max-height: 600px;
        top: 50%;
        left: 60%;
        background: radial-gradient(circle, #5B8CFF 0%, transparent 70%);
        opacity: 0.3;
        animation: ai-blob-4-float 20s ease-in-out infinite;
      }

      @keyframes ai-blob-1-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%      { transform: translate(8vw, 4vw) scale(1.05); }
      }
      @keyframes ai-blob-2-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%      { transform: translate(-6vw, 6vw) scale(1.08); }
      }
      @keyframes ai-blob-3-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%      { transform: translate(5vw, -4vw) scale(1.06); }
      }
      @keyframes ai-blob-4-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%      { transform: translate(-4vw, -3vw) scale(1.04); }
      }

      /* 중앙 클린 영역 — 가독성용 부드러운 어두운 vignette */
      .ai-center-glow {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(60% 50% at 50% 45%, rgba(0, 194, 255, 0.05) 0%, transparent 60%),
          radial-gradient(70% 60% at 50% 50%, transparent 0%, rgba(6, 8, 22, 0.55) 80%);
        pointer-events: none;
      }

      /* 미세한 그레인/노이즈 */
      .ai-grain {
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        opacity: 0.6;
        mix-blend-mode: overlay;
        pointer-events: none;
      }

      /* ==============================================================
         콘텐츠 컨테이너 (글래스 vs 화이트)
      ============================================================== */
      .ai-container {
        border-radius: 20px;
        padding: 28px 28px;
      }
      .ai-container-glass {
        background: rgba(15, 23, 42, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(22px) saturate(140%);
        -webkit-backdrop-filter: blur(22px) saturate(140%);
        box-shadow:
          0 20px 60px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }
      .ai-container-white {
        background: #ffffff;
        border: 1px solid rgba(229, 231, 235, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      }

      /* ==============================================================
         이벤트 카드 — 두 스타일
      ============================================================== */
      .ai-card {
        position: relative;
        isolation: isolate;
        border-radius: 14px;
        cursor: pointer;
        transition:
          transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
          background 280ms,
          border-color 280ms,
          box-shadow 320ms;
      }
      .ai-card:hover { transform: translateY(-2px); }

      /* Glass card — 다크 테마 */
      .ai-card-glass {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(16px) saturate(140%);
        -webkit-backdrop-filter: blur(16px) saturate(140%);
        color: #e2e8f0;
      }
      .ai-card-glass:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      }
      .ai-card-glass.is-selected {
        background: rgba(255, 255, 255, 0.08);
        border-color: var(--tint-fg);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04), 0 0 24px var(--tint-bg);
      }

      /* White card — 라이트 테마 */
      .ai-card-white {
        background: #ffffff;
        border: 1px solid rgba(229, 231, 235, 1);
        color: #111827;
      }
      .ai-card-white:hover {
        border-color: rgba(209, 213, 219, 1);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }
      .ai-card-white.is-selected {
        border-color: var(--tint-fg);
        box-shadow: 0 0 0 3px var(--tint-bg);
      }

      /* 외곽선 shimmer — hover 시 발동 (양쪽 공통) */
      @property --aibg-ang { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
      @keyframes aibg-rotate { to { --aibg-ang: 360deg; } }
      .ai-card-border {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1.5px;
        background: conic-gradient(
          from var(--aibg-ang, 0deg),
          transparent 0deg,
          transparent 200deg,
          var(--tint-fg) 250deg,
          rgba(255, 255, 255, 0.95) 320deg,
          var(--tint-fg) 350deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        opacity: 0;
        filter: drop-shadow(0 0 4px var(--tint-glow));
        transition: opacity 360ms;
        pointer-events: none;
      }
      .ai-card:hover .ai-card-border {
        opacity: 1;
        animation: aibg-rotate 3.5s linear infinite;
      }

      .ai-card-icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: var(--tint-bg); color: var(--tint-fg);
        display: flex; align-items: center; justify-content: center;
        transition: box-shadow 320ms;
      }
      .ai-card:hover .ai-card-icon {
        box-shadow: 0 0 0 4px var(--tint-bg);
      }
      .ai-card-category {
        font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--tint-fg); opacity: 0.95;
        margin-bottom: 2px;
      }
      .ai-card-title {
        font-size: 15px; font-weight: 600; line-height: 1.4; margin-bottom: 4px;
      }
      .ai-card-glass .ai-card-title { color: #f8fafc; }
      .ai-card-white .ai-card-title { color: #111827; }
      .ai-card-summary {
        font-size: 12.5px; line-height: 1.5; margin-bottom: 8px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .ai-card-glass .ai-card-summary { color: #cbd5e1; }
      .ai-card-white .ai-card-summary { color: #6b7280; }
      .ai-card-meta {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-variant-numeric: tabular-nums;
      }
      .ai-card-glass .ai-card-meta { color: #94a3b8; }
      .ai-card-white .ai-card-meta { color: #9ca3af; }
      .ai-card-meta-dot { opacity: 0.5; }

      .ai-card-ambient {
        width: 64px;
        height: 64px;
        opacity: 0.7;
        transition: opacity 320ms, transform 320ms;
      }
      .ai-card:hover .ai-card-ambient { opacity: 1; transform: scale(1.04); }
      .ai-pulse { fill: var(--tint-fg); filter: drop-shadow(0 0 3px var(--tint-glow)); }

      /* ==============================================================
         CTA 버튼 — 다크 테마 적합 버전
      ============================================================== */
      .ai-cta {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 20px;
        border-radius: 14px;
        font-weight: 600;
        font-size: 14px;
        letter-spacing: -0.01em;
        cursor: pointer;
        overflow: hidden;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        color: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow:
          0 8px 24px rgba(91, 140, 255, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.6);
        transition: transform 240ms, box-shadow 240ms;
      }
      .ai-cta:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
      .ai-cta:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow:
          0 12px 32px rgba(91, 140, 255, 0.4),
          0 0 0 1px rgba(91, 140, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }
      .ai-cta::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 30%, rgba(91, 140, 255, 0.15) 50%, transparent 70%);
        transform: translateX(-100%);
        transition: transform 800ms cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      .ai-cta:not(:disabled):hover::before { transform: translateX(100%); }

      /* ==============================================================
         반응형 + 접근성
      ============================================================== */
      @media (max-width: 640px) {
        .ai-blob { filter: blur(50px); opacity: 0.4; }
        .ai-card .ai-card-ambient { display: none; }
        .ai-card .ai-card-summary { display: none; }
        .ai-card-icon { width: 32px; height: 32px; }
        .ai-container { padding: 20px 16px; border-radius: 16px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .ai-blob, .ai-pulse, .ai-card-border, .ai-card-ambient {
          animation: none !important;
          transition: none !important;
        }
        .ai-card:hover { transform: none; }
      }
    `}</style>
  );
}
