'use client';

// 임시 미리보기 — 카드 우측 ambient 시각 변주 비교.
// 사용자가 선호하는 시안을 알려주면 홈 카드에 적용 + 페이지 삭제.

import { useState } from 'react';

type Variant = 'current' | 'orb' | 'network' | 'bars' | 'blob' | 'rings';

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
];

export default function AmbientPreview() {
  const [picked, setPicked] = useState<Variant | null>(null);

  return (
    <div className="bg-[#fafafa] min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">우측 ambient 시안 비교</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            5가지 시각 언어로 만든 AI premium 느낌의 ambient. 카테고리 톤(violet/emerald 등) 은 모두 동일하게 적용됨.
            마음에 드는 시안 알려주면 홈 카드에 적용 + 미리보기 페이지 삭제.
          </p>
        </header>

        <Section title="현재 — Neural Flow" subtitle="3개 곡선 + 펄스 도트" picked={picked === 'current'} onPick={() => setPicked('current')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="current" />)}
        </Section>

        <Section title="시안 A — Pulsing Orb" subtitle="중앙 광원 + 동심원 파동. 'AI 가 사고하는' 느낌. ChatGPT/Claude 풍" picked={picked === 'orb'} onPick={() => setPicked('orb')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="orb" />)}
        </Section>

        <Section title="시안 B — Constellation Network" subtitle="여러 노드와 연결선 + 노드별 펄스. 신경망 시각화 느낌. 가장 'AI tech'" picked={picked === 'network'} onPick={() => setPicked('network')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="network" />)}
        </Section>

        <Section title="시안 C — Frequency Bars" subtitle="높이가 다르게 움직이는 막대 5개. 음성 비서·EQ 처럼 살아있는 느낌" picked={picked === 'bars'} onPick={() => setPicked('bars')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="bars" />)}
        </Section>

        <Section title="시안 D — Liquid Blob" subtitle="유기적인 그라데이션 블롭이 천천히 변형. Apple Intelligence 풍" picked={picked === 'blob'} onPick={() => setPicked('blob')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="blob" />)}
        </Section>

        <Section title="시안 E — Concentric Rings" subtitle="가는 동심원 3개가 회전. 미니멀하면서 우아함. Linear 풍" picked={picked === 'rings'} onPick={() => setPicked('rings')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="rings" />)}
        </Section>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900"><strong>선택:</strong> &quot;시안 X 좋아&quot; 알려주면 적용하고 페이지 삭제.</p>
          {picked && <p className="text-sm font-semibold text-blue-700 mt-2">현재 선호: <span className="px-2 py-0.5 bg-white rounded">{picked}</span></p>}
        </div>
      </div>

      <Styles />
    </div>
  );
}

function Section({ title, subtitle, picked, onPick, children }: { title: string; subtitle: string; picked: boolean; onPick: () => void; children: React.ReactNode }) {
  return (
    <section className={`mb-8 rounded-2xl border-2 transition ${picked ? 'border-blue-400 shadow-lg' : 'border-transparent'}`}>
      <header className="flex items-center justify-between mb-3 px-1">
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
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const TINTS: Record<string, { fg: string; bg: string; line: string; glow: string }> = {
  세미나: { fg: '#7c3aed', bg: 'rgba(167, 139, 250, 0.1)', line: 'rgba(139, 92, 246, 0.4)', glow: 'rgba(139, 92, 246, 0.18)' },
  프로모션: { fg: '#059669', bg: 'rgba(52, 211, 153, 0.1)', line: 'rgba(16, 185, 129, 0.45)', glow: 'rgba(16, 185, 129, 0.18)' },
  워크샵: { fg: '#0891b2', bg: 'rgba(34, 211, 238, 0.1)', line: 'rgba(6, 182, 212, 0.45)', glow: 'rgba(6, 182, 212, 0.18)' },
  스프린트: { fg: '#ea580c', bg: 'rgba(251, 146, 60, 0.1)', line: 'rgba(249, 115, 22, 0.45)', glow: 'rgba(249, 115, 22, 0.18)' },
};

function PreviewCard({ event, variant }: { event: SampleEvent; variant: Variant }) {
  const tint = TINTS[event.category];
  return (
    <div
      className="ap-card relative bg-white border border-gray-200 rounded-2xl"
      style={{ '--tint-fg': tint.fg, '--tint-bg': tint.bg, '--tint-line': tint.line, '--tint-glow': tint.glow } as React.CSSProperties}
    >
      <div className="flex items-stretch gap-3.5 p-4">
        <div className="shrink-0 flex items-start pt-0.5">
          <div className="ap-icon">
            <CategoryIcon category={event.category} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="ap-category">{event.category}</div>
          <h3 className="ap-title">{event.name}</h3>
          <p className="ap-summary">{event.summary}</p>
          <div className="ap-meta">
            <CalendarIcon /> <span>{event.date}</span>
            <span className="ap-meta-dot">·</span>
            <span>{event.type === 'online' ? 'Online' : 'Offline'}</span>
            {event.capacity && (
              <>
                <span className="ap-meta-dot">·</span>
                <span>정원 {event.capacity}명</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 self-center">
          <div className="ap-ambient">
            {variant === 'current' && <NeuralFlow />}
            {variant === 'orb' && <PulsingOrb />}
            {variant === 'network' && <ConstellationNetwork />}
            {variant === 'bars' && <FrequencyBars />}
            {variant === 'blob' && <LiquidBlob />}
            {variant === 'rings' && <ConcentricRings />}
          </div>
        </div>
      </div>
    </div>
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

// ============================================================
// 시안별 ambient
// ============================================================
function NeuralFlow() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path d="M0 22 Q 16 14, 32 22 T 64 22" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <path d="M0 32 Q 20 38, 32 32 T 64 32" stroke="var(--tint-line)" strokeOpacity="0.45" strokeWidth="0.7" fill="none" />
      <path d="M0 42 Q 18 50, 32 42 T 64 42" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <circle r="1.6" cx="0" cy="32" className="ap-pulse">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M0 0 Q 20 6, 32 0 T 64 0" />
      </circle>
      <circle r="1.2" cx="0" cy="22" className="ap-pulse">
        <animateMotion dur="5.5s" repeatCount="indefinite" begin="-1.5s" path="M0 0 Q 16 -8, 32 0 T 64 0" />
      </circle>
    </svg>
  );
}

// 시안 A: Pulsing Orb — 중앙 광원 + 동심 파동
function PulsingOrb() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <defs>
        <radialGradient id="orb-grad">
          <stop offset="0%" stopColor="var(--tint-fg)" stopOpacity="0.95" />
          <stop offset="60%" stopColor="var(--tint-fg)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--tint-fg)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--tint-fg)" strokeOpacity="0.35" strokeWidth="0.8" className="ap-orb-ring ap-orb-ring-1" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--tint-fg)" strokeOpacity="0.35" strokeWidth="0.8" className="ap-orb-ring ap-orb-ring-2" />
      <circle cx="32" cy="32" r="9" fill="url(#orb-grad)" className="ap-orb-core" filter="drop-shadow(0 0 4px var(--tint-glow))" />
    </svg>
  );
}

// 시안 B: Constellation Network — 노드 + 연결선
function ConstellationNetwork() {
  // 노드 좌표 (5개)
  const nodes = [
    { x: 14, y: 18 },
    { x: 50, y: 14 },
    { x: 32, y: 32 },
    { x: 16, y: 48 },
    { x: 52, y: 50 },
  ];
  const edges: [number, number][] = [
    [0, 2], [1, 2], [2, 3], [2, 4], [0, 1], [3, 4],
  ];
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="var(--tint-fg)" strokeOpacity="0.35" strokeWidth="0.6"
          className={`ap-net-edge ap-net-edge-${i}`} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="2" fill="var(--tint-fg)"
          className={`ap-net-node ap-net-node-${i}`}
          filter="drop-shadow(0 0 3px var(--tint-glow))" />
      ))}
    </svg>
  );
}

// 시안 C: Frequency Bars — EQ 막대
function FrequencyBars() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i}
          x={10 + i * 11}
          y="22"
          width="6"
          height="20"
          rx="3"
          fill="var(--tint-fg)"
          fillOpacity="0.85"
          className={`ap-bar ap-bar-${i}`}
        />
      ))}
    </svg>
  );
}

// 시안 D: Liquid Blob — 유기적 그라데이션
function LiquidBlob() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <defs>
        <radialGradient id="blob-grad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="var(--tint-fg)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--tint-fg)" stopOpacity="0.35" />
        </radialGradient>
        <filter id="blob-blur"><feGaussianBlur stdDeviation="0.8" /></filter>
      </defs>
      <path
        className="ap-blob-shape"
        fill="url(#blob-grad)"
        filter="url(#blob-blur)"
        d="M 32 8 Q 50 14, 52 32 T 32 56 Q 14 50, 12 32 T 32 8 Z"
      />
    </svg>
  );
}

// 시안 E: Concentric Rings — 동심원 3개
function ConcentricRings() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <g className="ap-rings-group">
        <circle cx="32" cy="32" r="10" fill="none" stroke="var(--tint-fg)" strokeOpacity="0.85" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="var(--tint-fg)" strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="2 5" />
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--tint-fg)" strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="1 4" />
      </g>
      <circle cx="32" cy="32" r="3" fill="var(--tint-fg)" filter="drop-shadow(0 0 3px var(--tint-glow))" />
    </svg>
  );
}

// ============================================================
// 스타일
// ============================================================
function Styles() {
  return (
    <style jsx global>{`
      .ap-card { transition: box-shadow 280ms; }
      .ap-card:hover { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }

      .ap-icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: var(--tint-bg); color: var(--tint-fg);
        display: flex; align-items: center; justify-content: center;
      }
      .ap-category {
        font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--tint-fg); opacity: 0.85;
        margin-bottom: 2px;
      }
      .ap-title { font-size: 15px; font-weight: 600; color: #111827; line-height: 1.4; margin-bottom: 4px; }
      .ap-summary {
        font-size: 12.5px; color: #6b7280; line-height: 1.5; margin-bottom: 8px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .ap-meta {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; color: #9ca3af;
      }
      .ap-meta-dot { color: #d1d5db; }
      .ap-ambient { width: 64px; height: 64px; }

      /* === Neural Flow === */
      .ap-pulse { fill: var(--tint-fg); filter: drop-shadow(0 0 3px var(--tint-glow)); }

      /* === Pulsing Orb === */
      .ap-orb-core {
        transform-origin: 32px 32px;
        animation: ap-orb-breathe 2.6s ease-in-out infinite;
      }
      .ap-orb-ring {
        transform-origin: 32px 32px;
      }
      .ap-orb-ring-1 { animation: ap-orb-wave 3s ease-out infinite; }
      .ap-orb-ring-2 { animation: ap-orb-wave 3s ease-out infinite; animation-delay: 1.5s; }
      @keyframes ap-orb-breathe {
        0%, 100% { transform: scale(1); opacity: 0.95; }
        50%      { transform: scale(1.15); opacity: 1; }
      }
      @keyframes ap-orb-wave {
        0%   { transform: scale(0.4); opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: scale(1.05); opacity: 0; }
      }

      /* === Constellation Network === */
      .ap-net-node { transform-box: fill-box; transform-origin: center; animation: ap-net-blink 3s ease-in-out infinite; }
      .ap-net-node-0 { animation-delay: 0s; }
      .ap-net-node-1 { animation-delay: 0.6s; }
      .ap-net-node-2 { animation-delay: 1.2s; }
      .ap-net-node-3 { animation-delay: 1.8s; }
      .ap-net-node-4 { animation-delay: 2.4s; }
      @keyframes ap-net-blink {
        0%, 100% { opacity: 0.45; transform: scale(1); }
        50%      { opacity: 1;    transform: scale(1.3); }
      }
      .ap-net-edge { animation: ap-net-pulse 4s ease-in-out infinite; }
      .ap-net-edge-0 { animation-delay: 0s; }
      .ap-net-edge-1 { animation-delay: 0.5s; }
      .ap-net-edge-2 { animation-delay: 1s; }
      .ap-net-edge-3 { animation-delay: 1.5s; }
      .ap-net-edge-4 { animation-delay: 2s; }
      .ap-net-edge-5 { animation-delay: 2.5s; }
      @keyframes ap-net-pulse {
        0%, 100% { stroke-opacity: 0.2; }
        50%      { stroke-opacity: 0.55; }
      }

      /* === Frequency Bars === */
      .ap-bar { transform-origin: center 32px; transform-box: fill-box; }
      .ap-bar-0 { animation: ap-bar-flow 1.2s ease-in-out infinite; animation-delay: 0s; }
      .ap-bar-1 { animation: ap-bar-flow 1.4s ease-in-out infinite; animation-delay: 0.15s; }
      .ap-bar-2 { animation: ap-bar-flow 1.0s ease-in-out infinite; animation-delay: 0.3s; }
      .ap-bar-3 { animation: ap-bar-flow 1.3s ease-in-out infinite; animation-delay: 0.45s; }
      .ap-bar-4 { animation: ap-bar-flow 1.1s ease-in-out infinite; animation-delay: 0.6s; }
      @keyframes ap-bar-flow {
        0%, 100% { transform: scaleY(0.35); opacity: 0.6; }
        50%      { transform: scaleY(1);    opacity: 1; }
      }

      /* === Liquid Blob === */
      .ap-blob-shape {
        animation: ap-blob-morph 6s ease-in-out infinite, ap-blob-rotate 18s linear infinite;
        transform-origin: center;
        transform-box: fill-box;
      }
      @keyframes ap-blob-morph {
        0%, 100% { d: path("M 32 8 Q 50 14, 52 32 T 32 56 Q 14 50, 12 32 T 32 8 Z"); }
        50%      { d: path("M 32 12 Q 56 20, 50 32 T 32 52 Q 8 44, 14 32 T 32 12 Z"); }
      }
      @keyframes ap-blob-rotate {
        to { transform: rotate(360deg); }
      }

      /* === Concentric Rings === */
      .ap-rings-group {
        transform-origin: 32px 32px;
        animation: ap-rings-rotate 14s linear infinite;
      }
      @keyframes ap-rings-rotate {
        to { transform: rotate(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ap-pulse, .ap-orb-core, .ap-orb-ring, .ap-net-node, .ap-net-edge,
        .ap-bar, .ap-blob-shape, .ap-rings-group {
          animation: none !important;
        }
      }
    `}</style>
  );
}
