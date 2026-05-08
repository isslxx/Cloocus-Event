'use client';

// 임시 미리보기 — 신청자 포탈 홈 화면을 그대로 재현하고 시안 2 (Neural Flow) 카드 적용한 모습.
// 사용자가 적용 결정하면 실제 홈에 반영 후 이 페이지 삭제.

import { useState } from 'react';

type SampleEvent = {
  id: string;
  category: '세미나' | '프로모션' | '워크샵' | '스프린트';
  name: string;
  summary: string;
  date_start: string;        // ISO date (YYYY-MM-DD)
  date_end?: string;         // 2일 이상 연속 이벤트일 때만
  type: 'online' | 'offline';
  capacity?: number;
  status: 'open' | 'closed' | 'ended';
};

// 실제 운영 데이터에 가까운 샘플 (각 날짜 포맷 케이스 모두 포함)
const SAMPLES: SampleEvent[] = [
  {
    id: '1',
    category: '세미나',
    name: 'Copilot Hands-on Labs',
    summary: '현업 개발자와 함께 실무 코드베이스에 GitHub Copilot 을 적용해보는 체험 워크숍',
    date_start: '2026-05-22',
    type: 'offline',
    capacity: 20,
    status: 'open',
  },
  {
    id: '2',
    category: '프로모션',
    name: 'Gemini Enterprise 맞춤 견적 문의',
    summary: '조직 규모와 사용 시나리오에 맞춰 1:1 컨설팅과 견적을 제공합니다',
    date_start: '2026-06-30',
    type: 'online',
    status: 'open',
  },
  {
    id: '3',
    category: '워크샵',
    name: 'Azure 클라우드 인프라 입문',
    summary: '클라우드 처음 도입하는 팀을 위한 핵심 개념과 베스트 프랙티스 워크숍',
    date_start: '2026-07-15',
    date_end: '2026-07-16',  // 2일 연속 — 다중일 포맷 시연
    type: 'offline',
    capacity: 30,
    status: 'open',
  },
  {
    id: '4',
    category: '스프린트',
    name: 'AI 기반 데이터 파이프라인 설계 스프린트',
    summary: '데이터 인프라 팀과 함께 진행하는 4주 집중 스프린트 프로그램',
    date_start: '2026-04-28',
    type: 'offline',
    capacity: 10,
    status: 'ended',
  },
];

// ============================================================
// 날짜 포맷
// ============================================================
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}(${DOW[d.getDay()]})`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}(${DOW[d.getDay()]})`;
}

function formatEventDate(event: SampleEvent): string {
  if (event.category === '프로모션') {
    return `${formatFullDate(event.date_start)}까지`;
  }
  if (event.date_end && event.date_end !== event.date_start) {
    return `${formatShortDate(event.date_start)}-${formatShortDate(event.date_end)}`;
  }
  return formatFullDate(event.date_start);
}

export default function HomeCardPreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = SAMPLES.find((e) => e.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-[#fafafa] -mx-4 lg:-mx-8 -my-6 lg:-my-8">
      {/* 안내 바 */}
      <div className="bg-blue-600 text-white px-6 py-2 text-xs flex items-center gap-2 sticky top-0 z-50">
        <span className="font-medium">미리보기:</span>
        <span className="opacity-90">신청자 포탈 홈 화면 ─ 시안 2 (Neural Flow) 카드 적용 모습. 카드에 마우스 올려서 인터랙션 확인.</span>
      </div>

      {/* 실제 홈과 동일한 레이아웃 */}
      <div className="min-h-[calc(100vh-32px)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 py-10">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
              <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트</h1>
              <p className="text-gray-500 text-center mb-8">참여하실 이벤트를 선택해주세요.</p>

              <div className="space-y-3">
                {SAMPLES.map((event) => (
                  <PremiumCard
                    key={event.id}
                    event={event}
                    isSelected={selectedId === event.id}
                    onSelect={() => {
                      if (event.status === 'ended') return;
                      setSelectedId(event.id);
                    }}
                  />
                ))}
              </div>

              <button
                disabled={!selected}
                className="btn-primary w-full mt-6 disabled:opacity-40"
              >
                등록하기
              </button>
              <a className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 hover:underline block text-center">
                등록 정보 조회ㅣ신청자 포털
              </a>
            </div>
          </div>
        </div>

        {/* 풋터 (실제와 동일) */}
        <footer className="py-4 sm:py-5 px-4 border-t border-gray-200" style={{ backgroundColor: '#eef0f4' }}>
          <div className="max-w-lg mx-auto text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className="h-4 sm:h-5" />
              <span className="text-gray-300">|</span>
              <span className="text-xs sm:text-sm text-gray-600 font-medium">(주)클루커스</span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
              본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75)<br className="sm:hidden" />
              <span className="hidden sm:inline"> | </span>02-597-3400
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">marketing@cloocus.com</p>
          </div>
        </footer>
      </div>

      <PremiumStyles />
    </div>
  );
}

// ============================================================
// 카드
// ============================================================
function PremiumCard({ event, isSelected, onSelect }: {
  event: SampleEvent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isEnded = event.status === 'ended';
  const isClosed = event.status === 'closed';
  const tint = CATEGORY_TINTS[event.category] || CATEGORY_TINTS.default;

  return (
    <button
      type="button"
      disabled={isEnded}
      onClick={onSelect}
      className={`premium-card group relative w-full text-left ${isSelected ? 'is-selected' : ''} ${isEnded ? 'is-ended' : ''}`}
      style={{
        '--tint-fg': tint.fg,
        '--tint-bg': tint.bg,
        '--tint-line': tint.line,
        '--tint-glow': tint.glow,
      } as React.CSSProperties}
    >
      <span className="premium-card-border" aria-hidden="true" />

      <div className="relative z-[2] flex items-stretch gap-3.5 p-4">
        {/* 좌측 아이콘 */}
        <div className="shrink-0 flex items-start pt-0.5">
          <div className="premium-icon">
            <CategoryIcon category={event.category} />
          </div>
        </div>

        {/* 중앙 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="premium-category">{event.category}</span>
            {isEnded && <span className="premium-status-end">종료</span>}
            {isClosed && <span className="premium-status-closed">마감</span>}
          </div>
          <h3 className="premium-title">{event.name}</h3>
          <p className="premium-summary">{event.summary}</p>
          <div className="premium-meta">
            <span className="premium-meta-item">
              <CalendarIcon />
              <span>{formatEventDate(event)}</span>
            </span>
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
        <div className="shrink-0 flex items-stretch gap-2.5 self-stretch">
          <div className="premium-ambient" aria-hidden="true">
            <NeuralFlow />
          </div>
          <div className="self-center">
            <span className="premium-arrow" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
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
    fg: '#7c3aed',
    bg: 'rgba(167, 139, 250, 0.1)',
    line: 'rgba(139, 92, 246, 0.4)',
    glow: 'rgba(139, 92, 246, 0.18)',
  },
  프로모션: {
    fg: '#059669',
    bg: 'rgba(52, 211, 153, 0.1)',
    line: 'rgba(16, 185, 129, 0.45)',
    glow: 'rgba(16, 185, 129, 0.18)',
  },
  워크샵: {
    fg: '#0891b2',
    bg: 'rgba(34, 211, 238, 0.1)',
    line: 'rgba(6, 182, 212, 0.45)',
    glow: 'rgba(6, 182, 212, 0.18)',
  },
  스프린트: {
    fg: '#ea580c',
    bg: 'rgba(251, 146, 60, 0.1)',
    line: 'rgba(249, 115, 22, 0.45)',
    glow: 'rgba(249, 115, 22, 0.18)',
  },
  default: {
    fg: '#3b82f6',
    bg: 'rgba(96, 165, 250, 0.1)',
    line: 'rgba(59, 130, 246, 0.45)',
    glow: 'rgba(59, 130, 246, 0.18)',
  },
};

// ============================================================
// 카테고리 아이콘
// ============================================================
function CategoryIcon({ category }: { category: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (category === '세미나') {
    // 학사모 (graduation cap)
    return (
      <svg {...common}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    );
  }
  if (category === '프로모션') {
    // 별
    return (
      <svg {...common}>
        <path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.5L12 14.6 6 17.2l1-5.5-4-3.9 5.5-.8z" />
      </svg>
    );
  }
  if (category === '워크샵') {
    // 노트북 (이전 세미나 아이콘 사용)
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (category === '스프린트') {
    // 번개
    return (
      <svg {...common}>
        <polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

// 메타 정보 앞에 붙는 작은 캘린더 아이콘
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ============================================================
// Neural Flow ambient
// ============================================================
function NeuralFlow() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <path d="M0 22 Q 16 14, 32 22 T 64 22" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <path d="M0 32 Q 20 38, 32 32 T 64 32" stroke="var(--tint-line)" strokeOpacity="0.45" strokeWidth="0.7" fill="none" />
      <path d="M0 42 Q 18 50, 32 42 T 64 42" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <circle r="1.6" cx="0" cy="32" className="nf-pulse">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M0 0 Q 20 6, 32 0 T 64 0" />
      </circle>
      <circle r="1.2" cx="0" cy="22" className="nf-pulse">
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

      .premium-card {
        position: relative;
        isolation: isolate;
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid rgba(229, 231, 235, 0.95);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
        cursor: pointer;
        transition:
          transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 320ms cubic-bezier(0.4, 0, 0.2, 1),
          border-color 320ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .premium-card:hover {
        transform: translateY(-2px);
        border-color: rgba(209, 213, 219, 1);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .premium-card.is-selected {
        border-color: var(--tint-fg);
        box-shadow: 0 0 0 3px var(--tint-bg);
        background: linear-gradient(0deg, var(--tint-bg), var(--tint-bg)), #ffffff;
        background-blend-mode: normal;
      }
      .premium-card.is-ended {
        opacity: 0.55;
        cursor: not-allowed;
        background: #fafafa;
      }
      .premium-card.is-ended:hover {
        transform: none;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
      }

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
      .premium-card:hover:not(.is-ended) .premium-card-border {
        opacity: 1;
        animation: pc-rotate 5.5s linear infinite;
      }

      .premium-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--tint-bg);
        color: var(--tint-fg);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 320ms, transform 320ms;
      }
      .premium-card:hover:not(.is-ended) .premium-icon {
        box-shadow: 0 0 0 4px var(--tint-bg);
      }

      .premium-category {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--tint-fg);
        opacity: 0.85;
      }
      .premium-status-end {
        font-size: 10px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 999px;
        background: rgba(254, 226, 226, 0.9);
        color: #dc2626;
      }
      .premium-status-closed {
        font-size: 10px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 999px;
        background: rgba(254, 226, 226, 0.9);
        color: #dc2626;
      }
      .premium-title {
        font-size: 15px;
        font-weight: 600;
        color: #111827;
        line-height: 1.4;
        margin-top: 2px;
        margin-bottom: 4px;
        transition: color 280ms;
        word-break: keep-all;
      }
      .is-ended .premium-title { color: #9ca3af; }
      .premium-card:hover:not(.is-ended) .premium-title { color: #000; }
      .premium-summary {
        font-size: 12.5px;
        color: #6b7280;
        line-height: 1.5;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .premium-meta {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11.5px;
        color: #9ca3af;
        font-variant-numeric: tabular-nums;
        transition: color 280ms;
      }
      .premium-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .premium-meta-dot { color: #d1d5db; transition: color 280ms; }

      /* 선택된 카드: meta 정보가 카테고리 톤 컬러로 변하며 강조됨 */
      .premium-card.is-selected .premium-meta {
        color: var(--tint-fg);
        font-weight: 500;
      }
      .premium-card.is-selected .premium-meta-dot {
        color: var(--tint-fg);
        opacity: 0.45;
      }

      .premium-ambient {
        width: 48px;
        height: 48px;
        opacity: 0.6;
        transition: opacity 360ms;
        align-self: center;
      }
      .premium-card:hover:not(.is-ended) .premium-ambient { opacity: 1; }
      .is-ended .premium-ambient { opacity: 0.25; }

      .premium-arrow {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        background: #f9fafb;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #f3f4f6;
        transition:
          transform 320ms cubic-bezier(0.4, 0, 0.2, 1),
          background 280ms,
          color 280ms;
      }
      .premium-card:hover:not(.is-ended) .premium-arrow {
        background: #111827;
        color: #ffffff;
        transform: translateX(3px);
      }
      .is-selected .premium-arrow {
        background: var(--tint-fg);
        color: #ffffff;
      }

      .nf-pulse {
        fill: var(--tint-fg);
        filter: drop-shadow(0 0 3px var(--tint-glow));
      }

      /* 등록하기 / 푸터 등 실제 홈 스타일 일부 */
      .btn-primary {
        background: #2563eb;
        color: white;
        padding: 12px 16px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        transition: background 200ms;
      }
      .btn-primary:hover { background: #1d4ed8; }
      .btn-primary:disabled { cursor: not-allowed; }

      @media (hover: none) {
        .premium-card-border { opacity: 0 !important; animation: none !important; }
        .premium-card:hover { transform: none; }
      }
      @media (max-width: 640px) {
        .premium-icon { width: 32px; height: 32px; }
        .premium-ambient { width: 40px; height: 40px; }
        .premium-summary { -webkit-line-clamp: 2; font-size: 12px; }
        .premium-title { font-size: 14px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .premium-card,
        .premium-card-border,
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
