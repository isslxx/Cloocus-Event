'use client';

// 임시 시안 비교 페이지 — 사용자가 선택하면 삭제 예정.
// 컨셉: 평소엔 정적, 호버 시에만 블루 그라디언트 보더가 흐르고 내부 조명이 은은하게 퍼짐.
// 5가지는 "내부 조명" 처리 방식만 다름. 보더 두께 변화 없음.

import { useState, useRef } from 'react';

type Variant = 'A' | 'B' | 'C' | 'D' | 'E';

const SAMPLE_EVENT = {
  name: 'Copilot Hands-on Labs',
  category: '세미나',
  date: '2026년 5월 22일 (금)',
  capacity: 20,
};

export default function ShimmerPreviewPage() {
  const [picked, setPicked] = useState<Variant | null>(null);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">이벤트 카드 호버 모션 시안 (재구성)</h1>
        <p className="text-sm text-gray-500 mt-1">
          평소엔 정적, 호버할 때만 블루 그라디언트 보더가 흐르고 내부에 은은한 조명이 퍼짐. 5가지는 내부 조명 처리 방식이 달라.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          보더 두께 변화 없음 / 카드 본문에 영향 없음 / 마우스 호버해서 직접 비교해보세요.
        </p>
      </header>

      <div className="space-y-6">
        <Card
          name="시안 A"
          tag="중앙 조명 — 부드러운 광원"
          description="호버 시 보더에 블루 그라디언트가 흐르고, 카드 중앙에서 옅은 푸른빛이 둥글게 퍼져나감. 안정적이고 깔끔한 느낌."
          picked={picked === 'A'}
          onPick={() => setPicked('A')}
        >
          <CardA />
        </Card>

        <Card
          name="시안 B"
          tag="상단 조명 — 위에서 내려오는 빛"
          description="호버 시 보더 흐름 + 카드 상단에서 푸른빛이 아래로 부드럽게 떨어짐. 'spotlight 가 위에서 비추는' 느낌. 약간 영화적."
          picked={picked === 'B'}
          onPick={() => setPicked('B')}
        >
          <CardB />
        </Card>

        <Card
          name="시안 C"
          tag="커서 따라가는 조명 — 가장 인터랙티브"
          description="호버 시 보더 흐름 + 카드 위에서 마우스 커서를 따라다니는 부드러운 푸른빛 spotlight. 카드와 직접 대화하는 느낌."
          picked={picked === 'C'}
          onPick={() => setPicked('C')}
        >
          <CardC />
        </Card>

        <Card
          name="시안 D"
          tag="보더만 — 가장 미니멀"
          description="호버 시 보더에 블루 그라디언트만 흐름. 내부 조명 없음. 아주 깔끔하고 절제된 느낌."
          picked={picked === 'D'}
          onPick={() => setPicked('D')}
        >
          <CardD />
        </Card>

        <Card
          name="시안 E"
          tag="모서리 + 떠오름 — 입체감"
          description="호버 시 보더 흐름 + 우상단 모서리에서 푸른빛이 번지고 + 카드가 살짝 위로 떠오름 (1px). 입체감이 있고 클릭 유도성 강함."
          picked={picked === 'E'}
          onPick={() => setPicked('E')}
        >
          <CardE />
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>선택 안내:</strong> &quot;시안 X 좋아&quot; 처럼 알려주면 홈 카드 UI 에 적용 + 미리보기 페이지 정리.
        </p>
        {picked && (
          <p className="text-sm font-semibold text-blue-700 mt-2">
            현재 선호: <span className="px-2 py-0.5 bg-white rounded">시안 {picked}</span>
          </p>
        )}
      </div>

      <style jsx global>{`
        /* @property 로 conic-gradient 의 angle 을 애니메이션 가능하게 만듦 */
        @property --ang {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes shimmer-rotate { to { --ang: 360deg; } }

        /* ============== 공통: 호버 시 그라디언트 보더 ============== */
        /* 모든 시안의 보더는 동일한 conic-gradient 흐름 사용 */
        .shimmer-card {
          position: relative;
          isolation: isolate;
          transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .shimmer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;  /* border-2 와 동일 */
          background: conic-gradient(
            from var(--ang, 0deg),
            transparent 0deg,
            transparent 90deg,
            rgba(96, 165, 250, 0.5) 160deg,
            rgba(129, 140, 248, 0.95) 200deg,
            rgba(56, 189, 248, 0.95) 220deg,
            rgba(96, 165, 250, 0.5) 260deg,
            transparent 330deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          opacity: 0;
          transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 1;
        }
        .shimmer-card:hover::before {
          opacity: 1;
          animation: shimmer-rotate 3s linear infinite;
        }

        /* ============== 시안 A: 중앙 조명 ============== */
        .shimmer-a-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            ellipse at center,
            rgba(96, 165, 250, 0.18) 0%,
            rgba(96, 165, 250, 0.08) 40%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 400ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-a:hover .shimmer-a-glow { opacity: 1; }

        /* ============== 시안 B: 상단 조명 ============== */
        .shimmer-b-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            ellipse 70% 50% at 50% 0%,
            rgba(96, 165, 250, 0.25) 0%,
            rgba(96, 165, 250, 0.1) 40%,
            transparent 80%
          );
          opacity: 0;
          transition: opacity 400ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-b:hover .shimmer-b-glow { opacity: 1; }

        /* ============== 시안 C: 커서 따라가는 조명 ============== */
        .shimmer-c-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            circle 200px at var(--mx, 50%) var(--my, 50%),
            rgba(96, 165, 250, 0.22) 0%,
            rgba(96, 165, 250, 0.08) 30%,
            transparent 60%
          );
          opacity: 0;
          transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-c:hover .shimmer-c-glow { opacity: 1; }

        /* ============== 시안 D: 내부 조명 없음 (보더만) ============== */
        /* 추가 스타일 없음 */

        /* ============== 시안 E: 모서리 + 떠오름 ============== */
        .shimmer-e:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(96, 165, 250, 0.15), 0 2px 6px rgba(0, 0, 0, 0.04);
        }
        .shimmer-e-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            ellipse 60% 60% at 100% 0%,
            rgba(129, 140, 248, 0.28) 0%,
            rgba(96, 165, 250, 0.1) 40%,
            transparent 75%
          );
          opacity: 0;
          transition: opacity 400ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-e:hover .shimmer-e-glow { opacity: 1; }

        /* 접근성 */
        @media (prefers-reduced-motion: reduce) {
          .shimmer-card::before {
            animation: none !important;
            transition: none !important;
            opacity: 0 !important;
          }
          .shimmer-a-glow, .shimmer-b-glow, .shimmer-c-glow, .shimmer-e-glow {
            opacity: 0 !important;
            transition: none !important;
          }
          .shimmer-e:hover { transform: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Card({ name, tag, description, picked, onPick, children }: {
  name: string; tag: string; description: string; picked: boolean; onPick: () => void; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border-2 transition ${picked ? 'border-blue-400 shadow-md' : 'border-gray-200'} bg-gray-50`}>
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white rounded-t-xl">
        <div>
          <h2 className="font-bold text-gray-900">{name} <span className="text-xs font-normal text-gray-500 ml-2">{tag}</span></h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={onPick}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${picked ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50 bg-white'}`}
        >
          {picked ? '✓ 선호 표시됨' : '이 시안 선호'}
        </button>
      </header>
      <div className="p-10 bg-gray-50">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

function CardContent({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 2 }}>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 shrink-0">
            {SAMPLE_EVENT.category}
          </span>
          <p className="font-semibold text-base">{SAMPLE_EVENT.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap" style={{ position: 'relative', zIndex: 2 }}>
        <span className="text-sm text-gray-500">{SAMPLE_EVENT.date}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Offline</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">정원 {SAMPLE_EVENT.capacity}명</span>
      </div>
      {children}
    </>
  );
}

function CardA() {
  return (
    <button className="shimmer-card shimmer-a w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white">
      <span className="shimmer-a-glow" aria-hidden="true" />
      <CardContent />
    </button>
  );
}
function CardB() {
  return (
    <button className="shimmer-card shimmer-b w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white">
      <span className="shimmer-b-glow" aria-hidden="true" />
      <CardContent />
    </button>
  );
}
function CardC() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      className="shimmer-card shimmer-c w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white"
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
    >
      <span className="shimmer-c-glow" aria-hidden="true" />
      <CardContent />
    </button>
  );
}
function CardD() {
  return (
    <button className="shimmer-card shimmer-d w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white">
      <CardContent />
    </button>
  );
}
function CardE() {
  return (
    <button className="shimmer-card shimmer-e w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white">
      <span className="shimmer-e-glow" aria-hidden="true" />
      <CardContent />
    </button>
  );
}
