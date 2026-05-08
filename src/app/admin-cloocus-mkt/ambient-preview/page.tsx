'use client';

// 임시 미리보기 — 카드 우측 ambient 시각 변주 비교.
// B(Constellation) 킵 + 4개 새 컨셉 추가 (Data Stream / Aurora Glow / AI Wave / Radar Sweep).

import { useState } from 'react';

type Variant = 'current' | 'network' | 'stream' | 'aurora' | 'wave' | 'radar';

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
            B(Constellation Network) 킵 + 새 컨셉 4개. 모두 카테고리 톤(violet/emerald) 자동 적용.
            마음에 드는 시안 알려주면 홈 카드에 적용 + 미리보기 페이지 삭제.
          </p>
        </header>

        <Section title="현재 — Neural Flow" subtitle="3개 곡선 + 펄스 도트 (기준)" picked={picked === 'current'} onPick={() => setPicked('current')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="current" />)}
        </Section>

        <Section title="시안 B — Constellation Network (kept)" subtitle="여러 노드와 연결선 + 노드별 펄스. 신경망 시각화 느낌" picked={picked === 'network'} onPick={() => setPicked('network')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="network" />)}
        </Section>

        <Section title="시안 F — Data Stream" subtitle="세로 파이프 3개 + 데이터 패킷이 위에서 아래로 흐름. 가장 'data' 느낌" picked={picked === 'stream'} onPick={() => setPicked('stream')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="stream" />)}
        </Section>

        <Section title="시안 G — Aurora Glow" subtitle="여러 겹의 부드러운 그라데이션 빛이 천천히 흐름. 가장 럭셔리·organic" picked={picked === 'aurora'} onPick={() => setPicked('aurora')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="aurora" />)}
        </Section>

        <Section title="시안 H — AI Wave" subtitle="3개 사인파가 다른 속도로 흐름. 음성 AI / 신호 처리 느낌" picked={picked === 'wave'} onPick={() => setPicked('wave')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="wave" />)}
        </Section>

        <Section title="시안 I — Radar Sweep" subtitle="동심원 + 회전하는 레이더 빔 + 탐지된 도트. 'scanning / detecting' 느낌" picked={picked === 'radar'} onPick={() => setPicked('radar')}>
          {SAMPLES.map((e) => <PreviewCard key={e.id} event={e} variant="radar" />)}
        </Section>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900"><strong>선택:</strong> &quot;시안 X 좋아&quot; 알려주면 적용 + 페이지 삭제.</p>
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
            {variant === 'network' && <ConstellationNetwork />}
            {variant === 'stream' && <DataStream />}
            {variant === 'aurora' && <AuroraGlow />}
            {variant === 'wave' && <AIWave />}
            {variant === 'radar' && <RadarSweep />}
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

// 시안 B (kept)
function ConstellationNetwork() {
  const nodes = [
    { x: 14, y: 18 }, { x: 50, y: 14 }, { x: 32, y: 32 },
    { x: 16, y: 48 }, { x: 52, y: 50 },
  ];
  const edges: [number, number][] = [[0, 2], [1, 2], [2, 3], [2, 4], [0, 1], [3, 4]];
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

// 시안 F: Data Stream — 세로 파이프 + 데이터 패킷이 흐름
function DataStream() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* 세로 파이프 3개 */}
      <line x1="16" y1="6" x2="16" y2="58" stroke="var(--tint-line)" strokeOpacity="0.4" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="32" y1="6" x2="32" y2="58" stroke="var(--tint-line)" strokeOpacity="0.5" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="48" y1="6" x2="48" y2="58" stroke="var(--tint-line)" strokeOpacity="0.4" strokeWidth="0.6" strokeDasharray="2 3" />
      {/* 흐르는 데이터 패킷 — 각 파이프마다 다른 속도 */}
      <rect x="13" y="-8" width="6" height="6" rx="1.5" fill="var(--tint-fg)" className="ap-stream-pkt ap-stream-1" filter="drop-shadow(0 0 3px var(--tint-glow))" />
      <rect x="29" y="-8" width="6" height="6" rx="1.5" fill="var(--tint-fg)" className="ap-stream-pkt ap-stream-2" filter="drop-shadow(0 0 3px var(--tint-glow))" />
      <rect x="45" y="-8" width="6" height="6" rx="1.5" fill="var(--tint-fg)" className="ap-stream-pkt ap-stream-3" filter="drop-shadow(0 0 3px var(--tint-glow))" />
    </svg>
  );
}

// 시안 G: Aurora Glow — 여러 겹 그라데이션이 부드럽게 흐름
function AuroraGlow() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <defs>
        <radialGradient id="aurora-1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--tint-fg)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--tint-fg)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="aurora-2" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--tint-fg)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--tint-fg)" stopOpacity="0" />
        </radialGradient>
        <filter id="aurora-blur"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>
      <g filter="url(#aurora-blur)">
        <ellipse cx="22" cy="28" rx="20" ry="14" fill="url(#aurora-1)" className="ap-aurora-1" />
        <ellipse cx="42" cy="36" rx="22" ry="14" fill="url(#aurora-2)" className="ap-aurora-2" />
        <ellipse cx="32" cy="44" rx="18" ry="10" fill="url(#aurora-1)" className="ap-aurora-3" />
      </g>
    </svg>
  );
}

// 시안 H: AI Wave — 다중 사인파
function AIWave() {
  return (
    <svg viewBox="0 0 128 64" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <path d="M0 32 Q 8 18, 16 32 T 32 32 T 48 32 T 64 32 T 80 32 T 96 32 T 112 32 T 128 32"
        stroke="var(--tint-fg)" strokeOpacity="0.85" strokeWidth="1.2" fill="none" strokeLinecap="round"
        className="ap-wave-1" />
      <path d="M0 32 Q 12 22, 24 32 T 48 32 T 72 32 T 96 32 T 120 32 T 144 32"
        stroke="var(--tint-fg)" strokeOpacity="0.5" strokeWidth="1" fill="none" strokeLinecap="round"
        className="ap-wave-2" />
      <path d="M0 32 Q 16 24, 32 32 T 64 32 T 96 32 T 128 32 T 160 32"
        stroke="var(--tint-fg)" strokeOpacity="0.3" strokeWidth="0.8" fill="none" strokeLinecap="round"
        className="ap-wave-3" />
    </svg>
  );
}

// 시안 I: Radar Sweep — 회전 스윕 + 탐지된 도트
function RadarSweep() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <defs>
        <linearGradient id="radar-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--tint-fg)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--tint-fg)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* 동심원 */}
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--tint-line)" strokeOpacity="0.4" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="var(--tint-line)" strokeOpacity="0.3" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="var(--tint-line)" strokeOpacity="0.25" strokeWidth="0.5" />
      {/* 십자선 */}
      <line x1="32" y1="6" x2="32" y2="58" stroke="var(--tint-line)" strokeOpacity="0.2" strokeWidth="0.4" />
      <line x1="6" y1="32" x2="58" y2="32" stroke="var(--tint-line)" strokeOpacity="0.2" strokeWidth="0.4" />
      {/* 회전 스윕 — 부채꼴 모양 */}
      <g className="ap-radar-sweep">
        <path d="M 32 32 L 58 32 A 26 26 0 0 0 50 14 Z" fill="url(#radar-sweep)" opacity="0.55" />
      </g>
      {/* 탐지된 노드들 — 펄스 */}
      <circle cx="44" cy="22" r="1.6" fill="var(--tint-fg)" className="ap-radar-blip ap-radar-b1" filter="drop-shadow(0 0 2.5px var(--tint-glow))" />
      <circle cx="22" cy="44" r="1.4" fill="var(--tint-fg)" className="ap-radar-blip ap-radar-b2" filter="drop-shadow(0 0 2.5px var(--tint-glow))" />
      <circle cx="48" cy="46" r="1.2" fill="var(--tint-fg)" className="ap-radar-blip ap-radar-b3" filter="drop-shadow(0 0 2.5px var(--tint-glow))" />
      {/* 중앙 점 */}
      <circle cx="32" cy="32" r="1.5" fill="var(--tint-fg)" />
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

      /* === Constellation === */
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

      /* === Data Stream === */
      .ap-stream-pkt {
        animation: ap-stream-fall 2.5s linear infinite;
      }
      .ap-stream-1 { animation-delay: 0s; animation-duration: 2.4s; }
      .ap-stream-2 { animation-delay: -0.8s; animation-duration: 2.8s; }
      .ap-stream-3 { animation-delay: -1.6s; animation-duration: 2.6s; }
      @keyframes ap-stream-fall {
        0%   { transform: translateY(0); opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { transform: translateY(72px); opacity: 0; }
      }

      /* === Aurora Glow === */
      .ap-aurora-1 {
        animation: ap-aurora-drift1 7s ease-in-out infinite;
        transform-box: fill-box; transform-origin: center;
      }
      .ap-aurora-2 {
        animation: ap-aurora-drift2 9s ease-in-out infinite;
        transform-box: fill-box; transform-origin: center;
      }
      .ap-aurora-3 {
        animation: ap-aurora-drift3 8s ease-in-out infinite;
        transform-box: fill-box; transform-origin: center;
      }
      @keyframes ap-aurora-drift1 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
        50%      { transform: translate(8px, -4px) scale(1.1); opacity: 1; }
      }
      @keyframes ap-aurora-drift2 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
        50%      { transform: translate(-6px, 6px) scale(1.15); opacity: 0.85; }
      }
      @keyframes ap-aurora-drift3 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        50%      { transform: translate(4px, -6px) scale(1.08); opacity: 0.7; }
      }

      /* === AI Wave === */
      .ap-wave-1 { animation: ap-wave-flow1 3s linear infinite; }
      .ap-wave-2 { animation: ap-wave-flow2 4s linear infinite; }
      .ap-wave-3 { animation: ap-wave-flow3 5s linear infinite; }
      @keyframes ap-wave-flow1 { from { transform: translateX(0); } to { transform: translateX(-32px); } }
      @keyframes ap-wave-flow2 { from { transform: translateX(0); } to { transform: translateX(-48px); } }
      @keyframes ap-wave-flow3 { from { transform: translateX(0); } to { transform: translateX(-64px); } }

      /* === Radar Sweep === */
      .ap-radar-sweep {
        transform-origin: 32px 32px;
        animation: ap-radar-rotate 3.5s linear infinite;
      }
      @keyframes ap-radar-rotate { to { transform: rotate(360deg); } }
      .ap-radar-blip {
        transform-box: fill-box; transform-origin: center;
        animation: ap-radar-blink 2.5s ease-in-out infinite;
      }
      .ap-radar-b1 { animation-delay: 0.2s; }
      .ap-radar-b2 { animation-delay: 1.2s; }
      .ap-radar-b3 { animation-delay: 2.0s; }
      @keyframes ap-radar-blink {
        0%, 70%, 100% { opacity: 0.4; transform: scale(1); }
        15%, 35%      { opacity: 1;   transform: scale(1.6); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ap-pulse, .ap-net-node, .ap-net-edge,
        .ap-stream-pkt, .ap-aurora-1, .ap-aurora-2, .ap-aurora-3,
        .ap-wave-1, .ap-wave-2, .ap-wave-3,
        .ap-radar-sweep, .ap-radar-blip {
          animation: none !important;
        }
      }
    `}</style>
  );
}
