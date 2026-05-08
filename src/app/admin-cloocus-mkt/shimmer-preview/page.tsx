'use client';

// 임시 시안 비교 페이지 — 사용자가 shimmer 디자인을 선택하면 삭제 예정.
// 신청자 포탈 홈 화면의 이벤트 카드 UI 에 적용할 "프리미엄 반짝임" 효과 5종 비교.

import { useState } from 'react';

type Variant = 'A' | 'B' | 'C' | 'D' | 'E';

const SAMPLE_EVENT = {
  name: 'Copilot Hands-on Labs',
  category: '세미나',
  date: '2026년 5월 22일 (금)',
  event_type: 'offline' as const,
  capacity: 20,
};

export default function ShimmerPreviewPage() {
  const [picked, setPicked] = useState<Variant | null>(null);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">이벤트 카드 shimmer 디자인 시안</h1>
        <p className="text-sm text-gray-500 mt-1">
          신청자 포탈 홈 화면의 이벤트 카드에 적용할 &ldquo;프리미엄 반짝임&rdquo; 효과 5종.
          마음에 드는 시안을 채팅으로 알려주면 적용하고 이 페이지는 삭제할게.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          모든 시안: prefers-reduced-motion 환경에서 자동 비활성화 / 모바일에선 강도·속도 자동 감쇠
        </p>
      </header>

      <div className="space-y-6">
        <Card
          name="시안 A"
          tag="Border 회전 streak — Linear/Arc 풍"
          description="conic-gradient 한 줄기가 카드 테두리를 6초 주기로 천천히 순환. mask-composite 로 border 영역에만 노출. 가장 '프리미엄' 인상이 강함."
          picked={picked === 'A'}
          onPick={() => setPicked('A')}
        >
          <CardA />
        </Card>

        <Card
          name="시안 B"
          tag="대각선 sweep — Apple 풍 빛 반사"
          description="얇은 흰색 선이 카드 위를 대각선으로 천천히 스쳐 지나감. 가장 절제된 느낌. '빛이 한 번 흐르는' 표현에 가장 충실."
          picked={picked === 'B'}
          onPick={() => setPicked('B')}
        >
          <CardB />
        </Card>

        <Card
          name="시안 C"
          tag="상단 edge highlight — 미니멀"
          description="카드 상단 테두리에 가는 흰색 highlight 가 좌우로 천천히 흐름. 가장 절제된 — '거의 정적이지만 살아있는' 느낌."
          picked={picked === 'C'}
          onPick={() => setPicked('C')}
        >
          <CardC />
        </Card>

        <Card
          name="시안 D"
          tag="Border breath — 정적 호흡"
          description="테두리 전체가 5초 주기로 미세하게 밝아졌다 어두워졌다 반복. 움직임은 없지만 카드가 '숨쉬는' 느낌."
          picked={picked === 'D'}
          onPick={() => setPicked('D')}
        >
          <CardD />
        </Card>

        <Card
          name="시안 E"
          tag="Hover-only sweep — 가장 절제"
          description="평소엔 정적인 카드. 마우스 hover 시에만 한 번 빛이 흘러감. interaction 기반이라 정보 가독성 100% 보장."
          picked={picked === 'E'}
          onPick={() => setPicked('E')}
        >
          <CardE />
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>선택 안내:</strong> &quot;시안 B 로 가자&quot; 같이 알려주면 홈 카드 UI 에 적용하고 이 미리보기 페이지는 정리할게.
        </p>
        {picked && (
          <p className="text-sm font-semibold text-blue-700 mt-2">
            현재 표시된 선호: <span className="px-2 py-0.5 bg-white rounded">시안 {picked}</span>
            <span className="text-xs text-gray-500 ml-2">(이 화면에서 비교용으로만 — 실제 적용은 채팅으로)</span>
          </p>
        )}
      </div>

      {/* 시안 A: border 회전 streak */}
      <style jsx global>{`
        .shimmer-a {
          position: relative;
          isolation: isolate;
        }
        .shimmer-a::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 270deg,
            rgba(255, 255, 255, 0.55) 320deg,
            rgba(180, 200, 230, 0.85) 340deg,
            rgba(255, 255, 255, 0.55) 360deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: shimmer-a-spin 6s linear infinite;
          pointer-events: none;
          opacity: 0.7;
        }
        .shimmer-a:hover::before { opacity: 1; }
        @keyframes shimmer-a-spin {
          to { transform: rotate(360deg); }
        }

        /* 시안 B: 대각선 sweep */
        .shimmer-b { position: relative; overflow: hidden; }
        .shimmer-b::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 255, 255, 0.0) 40%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.0) 60%,
            transparent 70%
          );
          transform: translateX(-100%);
          animation: shimmer-b-sweep 5s ease-in-out infinite;
          pointer-events: none;
        }
        .shimmer-b:hover::before { animation-duration: 3s; }
        @keyframes shimmer-b-sweep {
          0% { transform: translateX(-100%); }
          60%, 100% { transform: translateX(100%); }
        }

        /* 시안 C: 상단 edge highlight */
        .shimmer-c { position: relative; overflow: hidden; }
        .shimmer-c::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 30%,
            rgba(255, 255, 255, 0.9) 50%,
            transparent 70%,
            transparent 100%
          );
          animation: shimmer-c-flow 4.5s ease-in-out infinite;
          pointer-events: none;
        }
        .shimmer-c:hover::before { opacity: 1.2; filter: brightness(1.1); }
        @keyframes shimmer-c-flow {
          0% { transform: translateX(-30%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(30%); opacity: 0; }
        }

        /* 시안 D: border breath */
        .shimmer-d { position: relative; }
        .shimmer-d::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.5),
            0 0 8px rgba(150, 170, 200, 0.15);
          animation: shimmer-d-breath 5s ease-in-out infinite;
          pointer-events: none;
          opacity: 0.6;
        }
        .shimmer-d:hover::before { opacity: 0.9; }
        @keyframes shimmer-d-breath {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        /* 시안 E: hover-only sweep */
        .shimmer-e { position: relative; overflow: hidden; transition: box-shadow 200ms; }
        .shimmer-e::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 255, 255, 0.55) 50%,
            transparent 70%
          );
          transform: translateX(-100%);
          transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-e:hover::before { transform: translateX(100%); }
        .shimmer-e:hover { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }

        /* 모바일 감쇠 */
        @media (max-width: 640px) {
          .shimmer-a::before, .shimmer-b::before, .shimmer-c::before, .shimmer-d::before {
            animation-duration: 8s;
            opacity: 0.5;
          }
        }

        /* 접근성: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .shimmer-a::before, .shimmer-b::before, .shimmer-c::before, .shimmer-d::before, .shimmer-e::before {
            animation: none !important;
            transition: none !important;
            opacity: 0;
          }
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
      <div className="p-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

// 카드 본문은 실제 홈의 이벤트 카드 마크업과 거의 동일하게 재현
function CardBody({ extraClass }: { extraClass: string }) {
  return (
    <button
      className={`w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all bg-white ${extraClass}`}
      style={{ position: 'relative' }}
    >
      <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 shrink-0">
            {SAMPLE_EVENT.category}
          </span>
          <p className="font-semibold text-base">{SAMPLE_EVENT.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap" style={{ position: 'relative', zIndex: 1 }}>
        <span className="text-sm text-gray-500">{SAMPLE_EVENT.date}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Offline</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">정원 {SAMPLE_EVENT.capacity}명</span>
      </div>
    </button>
  );
}

function CardA() { return <CardBody extraClass="shimmer-a" />; }
function CardB() { return <CardBody extraClass="shimmer-b" />; }
function CardC() { return <CardBody extraClass="shimmer-c" />; }
function CardD() { return <CardBody extraClass="shimmer-d" />; }
function CardE() { return <CardBody extraClass="shimmer-e" />; }
