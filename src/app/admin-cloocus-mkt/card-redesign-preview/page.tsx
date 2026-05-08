'use client';

// 임시 시안 — Premium AI Product Experience 컨셉 카드 리디자인 미리보기.
// 사용자가 적용 결정하면 홈에 반영 후 이 페이지 삭제.

import { useState } from 'react';

type AmbientVariant = 'particles' | 'flow';

type SampleEvent = {
  id: string;
  category: '세미나' | '프로모션' | '워크샵';
  name: string;
  summary: string;
  date: string;
  type: 'online' | 'offline';
  capacity?: number;
};

const SAMPLES: SampleEvent[] = [
  {
    id: '1',
    category: '세미나',
    name: 'Copilot Hands-on Labs',
    summary: '현업 개발자와 함께 실무 코드베이스에 GitHub Copilot 을 적용해보는 체험 워크숍',
    date: '2026.05.22',
    type: 'offline',
    capacity: 20,
  },
  {
    id: '2',
    category: '프로모션',
    name: 'Gemini Enterprise 맞춤 견적 문의',
    summary: '조직 규모와 사용 시나리오에 맞춰 1:1 컨설팅과 견적을 제공합니다',
    date: '2026.06.30',
    type: 'online',
  },
  {
    id: '3',
    category: '워크샵',
    name: 'Azure 클라우드 인프라 입문',
    summary: '클라우드 처음 도입하는 팀을 위한 핵심 개념과 베스트 프랙티스 워크숍',
    date: '2026.07.15',
    type: 'offline',
    capacity: 30,
  },
];

export default function CardRedesignPreview() {
  const [picked, setPicked] = useState<AmbientVariant | null>(null);

  return (
    <div className="bg-[#fafafa] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">이벤트 카드 리디자인 — Premium AI Experience</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            살아있는 인터페이스 컨셉. 좌측 카테고리 아이콘 · 중앙 타이틀+요약 · 우측 ambient visual + arrow.
            보더 shimmer + hover lift + ambient motion 으로 정적이지 않은 카드.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            마우스를 카드 위에 올려서 hover 인터랙션을 확인해보세요. ambient visual 처리 방식만 두 가지로 변주.
          </p>
        </header>

        {/* 시안 1: 파티클 필드 */}
        <Section
          title="시안 1 — Particle Field"
          subtitle="우측에 작은 빛 입자들이 천천히 부유. 가장 차분하고 ambient 한 느낌."
          picked={picked === 'particles'}
          onPick={() => setPicked('particles')}
        >
          {SAMPLES.map((evt) => <PremiumCard key={evt.id} event={evt} variant="particles" />)}
        </Section>

        {/* 시안 2: 뉴럴 플로우 */}
        <Section
          title="시안 2 — Neural Flow"
          subtitle="우측에 가는 선이 흐르고 펄스 도트가 따라 움직임. 약간 더 'AI tech' 한 인상."
          picked={picked === 'flow'}
          onPick={() => setPicked('flow')}
        >
          {SAMPLES.map((evt) => <PremiumCard key={evt.id} event={evt} variant="flow" />)}
        </Section>

        {/* 결정 안내 + 추가 컨텍스트 */}
        <div className="mt-10 p-5 bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm font-semibold text-gray-900 mb-2">선택 안내</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            &quot;시안 1 좋아&quot; 또는 &quot;시안 2 로 가자&quot; 알려주면 홈 카드 UI 에 적용 + 미리보기 페이지 삭제.
          </p>
          {picked && (
            <p className="text-sm font-semibold text-blue-700 mt-3">
              현재 선호: <span className="px-2 py-0.5 bg-blue-50 rounded">{picked === 'particles' ? '시안 1 (Particle)' : '시안 2 (Neural Flow)'}</span>
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-1.5">⚠ 적용 시 함께 결정해야 할 것</p>
            <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
              <li>• <strong>AI summary 컬럼</strong>: 현재 events 테이블에 1~2줄 요약 필드가 없음. DB 컬럼 추가 + 관리자 UI 입력란 필요. 일시적으로는 비어있어도 OK (요약 없으면 이벤트명만 노출)</li>
              <li>• <strong>아이콘 매핑</strong>: 카테고리별 아이콘 (현재는 시안에서 임의 매핑). 더 정교한 카테고리·아이콘 룰 정해야 함</li>
              <li>• <strong>날짜 표기 변경</strong>: &quot;2026년 5월 22일 (금)&quot; → &quot;2026.05.22&quot; 로 단순화 적용 여부</li>
            </ul>
          </div>
        </div>
      </div>

      <PremiumStyles />
    </div>
  );
}

function Section({ title, subtitle, picked, onPick, children }: {
  title: string; subtitle: string; picked: boolean; onPick: () => void; children: React.ReactNode;
}) {
  return (
    <section className={`mb-10 rounded-2xl border-2 transition ${picked ? 'border-blue-400 shadow-lg' : 'border-transparent'}`}>
      <header className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onPick}
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${picked ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50 bg-white'}`}
        >
          {picked ? '✓ 선호 표시됨' : '이 시안 선호'}
        </button>
      </header>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

// ============================================================
// 카드 컴포넌트
// ============================================================
function PremiumCard({ event, variant }: { event: SampleEvent; variant: AmbientVariant }) {
  const tint = CATEGORY_TINTS[event.category] || CATEGORY_TINTS.default;

  return (
    <button
      className="premium-card group relative w-full text-left"
      style={{
        // CSS 변수로 카테고리 톤 주입
        '--tint-fg': tint.fg,
        '--tint-bg': tint.bg,
        '--tint-line': tint.line,
        '--tint-glow': tint.glow,
      } as React.CSSProperties}
    >
      {/* border shimmer (호버 시 흐름) */}
      <span className="premium-card-border" aria-hidden="true" />

      <div className="relative z-[2] flex items-stretch gap-4 p-5 sm:p-6">
        {/* 좌측 아이콘 영역 */}
        <div className="shrink-0">
          <div className="premium-icon">
            <CategoryIcon category={event.category} />
          </div>
        </div>

        {/* 중앙 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="premium-category">{event.category}</span>
          </div>
          <h3 className="premium-title">{event.name}</h3>
          <p className="premium-summary">{event.summary}</p>
          <div className="premium-meta">
            <span>{event.date}</span>
            <span className="premium-meta-dot">·</span>
            <span>{event.type === 'online' ? 'Online' : 'Offline'}</span>
            {event.capacity && (
              <>
                <span className="premium-meta-dot">·</span>
                <span>정원 {event.capacity}명</span>
              </>
            )}
          </div>
        </div>

        {/* 우측 ambient + arrow */}
        <div className="shrink-0 flex items-stretch gap-3 self-stretch">
          <div className="premium-ambient" aria-hidden="true">
            {variant === 'particles' ? <ParticleField category={event.category} /> : <NeuralFlow category={event.category} />}
          </div>
          <div className="self-center">
            <span className="premium-arrow" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

const CATEGORY_TINTS: Record<string, { fg: string; bg: string; line: string; glow: string }> = {
  세미나: {
    fg: '#7c3aed',         // violet-600
    bg: 'rgba(167, 139, 250, 0.08)',  // violet-400 8%
    line: 'rgba(139, 92, 246, 0.35)', // violet-500 35%
    glow: 'rgba(139, 92, 246, 0.18)',
  },
  프로모션: {
    fg: '#059669',         // emerald-600
    bg: 'rgba(52, 211, 153, 0.08)',
    line: 'rgba(16, 185, 129, 0.4)',
    glow: 'rgba(16, 185, 129, 0.18)',
  },
  워크샵: {
    fg: '#0891b2',         // cyan-600
    bg: 'rgba(34, 211, 238, 0.08)',
    line: 'rgba(6, 182, 212, 0.4)',
    glow: 'rgba(6, 182, 212, 0.18)',
  },
  default: {
    fg: '#3b82f6',
    bg: 'rgba(96, 165, 250, 0.08)',
    line: 'rgba(59, 130, 246, 0.4)',
    glow: 'rgba(59, 130, 246, 0.18)',
  },
};

// ============================================================
// 카테고리 아이콘
// ============================================================
function CategoryIcon({ category }: { category: string }) {
  if (category === '세미나') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (category === '프로모션') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.5L12 14.6 6 17.2l1-5.5-4-3.9 5.5-.8z" />
      </svg>
    );
  }
  if (category === '워크샵') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 010 1.4l-1.4 1.4 4.2 4.2a2 2 0 010 2.8l-1.4 1.4a2 2 0 01-2.8 0l-4.2-4.2-1.4 1.4a1 1 0 01-1.4-1.4L11 7.7l1.4-1.4a1 1 0 011.4 0l.9.9z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

// ============================================================
// 시안 1: Particle Field
// ============================================================
function ParticleField({ category }: { category: string }) {
  const k = category;
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
      {/* 배경 원 — 매우 옅은 톤 */}
      <circle cx="32" cy="32" r="26" stroke="var(--tint-line)" strokeOpacity="0.15" strokeWidth="0.5" fill="none" />
      <circle cx="32" cy="32" r="18" stroke="var(--tint-line)" strokeOpacity="0.1" strokeWidth="0.5" fill="none" />
      {/* 부유 입자들 */}
      <circle className={`pf-particle pf-p1 pf-${k}`} cx="18" cy="22" r="1.4" />
      <circle className={`pf-particle pf-p2 pf-${k}`} cx="44" cy="18" r="1.8" />
      <circle className={`pf-particle pf-p3 pf-${k}`} cx="50" cy="40" r="1.2" />
      <circle className={`pf-particle pf-p4 pf-${k}`} cx="22" cy="46" r="1.6" />
      <circle className={`pf-particle pf-p5 pf-${k}`} cx="36" cy="32" r="1.3" />
      <circle className={`pf-particle pf-p6 pf-${k}`} cx="14" cy="38" r="1" />
    </svg>
  );
}

// ============================================================
// 시안 2: Neural Flow
// ============================================================
function NeuralFlow({ category }: { category: string }) {
  const k = category;
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 흐르는 라인들 */}
      <path d="M0 22 Q 16 14, 32 22 T 64 22" stroke="var(--tint-line)" strokeOpacity="0.25" strokeWidth="0.7" fill="none" />
      <path d="M0 32 Q 20 38, 32 32 T 64 32" stroke="var(--tint-line)" strokeOpacity="0.4" strokeWidth="0.7" fill="none" />
      <path d="M0 42 Q 18 50, 32 42 T 64 42" stroke="var(--tint-line)" strokeOpacity="0.25" strokeWidth="0.7" fill="none" />
      {/* 펄스 도트 — 가운데 라인 위를 흐름 */}
      <circle className={`nf-pulse nf-${k}`} r="1.6" cx="0" cy="32">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M0 0 Q 20 6, 32 0 T 64 0" />
      </circle>
      <circle className={`nf-pulse nf-${k} nf-pulse-2`} r="1.2" cx="0" cy="22">
        <animateMotion dur="5.5s" repeatCount="indefinite" begin="-1.5s" path="M0 0 Q 16 -8, 32 0 T 64 0" />
      </circle>
    </svg>
  );
}

// ============================================================
// 스타일
// ============================================================
function PremiumStyles() {
  return (
    <style jsx global>{`
      @property --pc-ang {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }
      @keyframes pc-rotate { to { --pc-ang: 360deg; } }

      /* ============== 카드 본체 ============== */
      .premium-card {
        position: relative;
        isolation: isolate;
        background: #ffffff;
        border-radius: 24px;
        border: 1px solid rgba(229, 231, 235, 0.9);
        box-shadow:
          0 1px 2px rgba(15, 23, 42, 0.025),
          0 0 0 0 rgba(15, 23, 42, 0.0);
        cursor: pointer;
        transition:
          transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 320ms cubic-bezier(0.4, 0, 0.2, 1),
          border-color 320ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .premium-card:hover {
        transform: translateY(-3px);
        border-color: rgba(209, 213, 219, 1);
        box-shadow:
          0 10px 30px rgba(15, 23, 42, 0.06),
          0 1px 2px rgba(15, 23, 42, 0.04);
      }

      /* ============== Border shimmer (호버 시 발동) ============== */
      .premium-card-border {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1px;
        background: conic-gradient(
          from var(--pc-ang, 0deg),
          transparent 0deg,
          transparent 220deg,
          var(--tint-line) 290deg,
          rgba(255, 255, 255, 0.95) 320deg,
          var(--tint-line) 350deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        opacity: 0;
        transition: opacity 360ms cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      .premium-card:hover .premium-card-border {
        opacity: 1;
        animation: pc-rotate 5.5s linear infinite;
      }

      /* ============== 좌측 아이콘 ============== */
      .premium-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--tint-bg);
        color: var(--tint-fg);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 320ms, transform 320ms;
      }
      .premium-card:hover .premium-icon {
        box-shadow: 0 0 0 6px var(--tint-bg);
        transform: scale(1.02);
      }

      /* ============== 중앙 콘텐츠 타이포그래피 ============== */
      .premium-category {
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--tint-fg);
        opacity: 0.85;
      }
      .premium-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        line-height: 1.35;
        margin-bottom: 4px;
        transition: color 280ms;
      }
      .premium-card:hover .premium-title {
        color: #000;
      }
      .premium-summary {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.5;
        margin-bottom: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .premium-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #9ca3af;
        font-variant-numeric: tabular-nums;
      }
      .premium-meta-dot {
        color: #d1d5db;
      }

      /* ============== 우측 ambient + arrow ============== */
      .premium-ambient {
        width: 60px;
        height: 60px;
        opacity: 0.55;
        transition: opacity 360ms;
        align-self: center;
      }
      .premium-card:hover .premium-ambient {
        opacity: 1;
      }
      .premium-arrow {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: #f9fafb;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #f3f4f6;
        transition:
          transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
          background 280ms,
          color 280ms;
      }
      .premium-card:hover .premium-arrow {
        background: #111827;
        color: #ffffff;
        transform: translateX(4px);
      }

      /* ============== 시안 1: Particle Field 애니메이션 ============== */
      .pf-particle {
        fill: var(--tint-fg);
        opacity: 0.35;
        transform-origin: center;
      }
      .premium-card:hover .pf-particle { opacity: 0.7; }
      .pf-p1 { animation: pf-drift1 7s ease-in-out infinite; }
      .pf-p2 { animation: pf-drift2 9s ease-in-out infinite; }
      .pf-p3 { animation: pf-drift3 8s ease-in-out infinite; }
      .pf-p4 { animation: pf-drift4 10s ease-in-out infinite; }
      .pf-p5 { animation: pf-drift5 6s ease-in-out infinite; }
      .pf-p6 { animation: pf-drift6 11s ease-in-out infinite; }
      @keyframes pf-drift1 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(2px, -3px); }
      }
      @keyframes pf-drift2 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(-3px, 4px); }
      }
      @keyframes pf-drift3 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(-4px, -2px); }
      }
      @keyframes pf-drift4 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(3px, -4px); }
      }
      @keyframes pf-drift5 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(2px, 3px); }
      }
      @keyframes pf-drift6 {
        0%, 100% { transform: translate(0, 0); }
        50%      { transform: translate(-2px, 3px); }
      }

      /* ============== 시안 2: Neural Flow 애니메이션 ============== */
      .nf-pulse {
        fill: var(--tint-fg);
        filter: drop-shadow(0 0 3px var(--tint-glow));
      }
      .premium-card:hover .nf-pulse { filter: drop-shadow(0 0 4px var(--tint-glow)); }

      /* ============== 모바일 감쇠 ============== */
      @media (hover: none) {
        .premium-card-border { opacity: 0 !important; animation: none !important; }
        .premium-card:hover { transform: none; }
      }
      @media (max-width: 640px) {
        .premium-icon { width: 40px; height: 40px; }
        .premium-ambient { width: 48px; height: 48px; }
        .premium-summary { -webkit-line-clamp: 1; }
      }

      /* ============== 접근성 ============== */
      @media (prefers-reduced-motion: reduce) {
        .premium-card,
        .premium-card-border,
        .pf-particle,
        .premium-ambient,
        .premium-arrow,
        .premium-icon,
        .premium-title {
          animation: none !important;
          transition: none !important;
        }
        .premium-card:hover { transform: none; }
        .nf-pulse { display: none; }
      }
    `}</style>
  );
}
