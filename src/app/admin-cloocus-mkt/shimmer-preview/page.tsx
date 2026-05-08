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
          tag="대각선 sweep — 광택 흐름"
          description="흰색 빛 줄기가 4초 주기로 카드를 비스듬히 가로지름. blur 가 들어간 부드러운 광택이 확실히 인지됨. 메탈 표면에 빛이 스치는 느낌."
          picked={picked === 'B'}
          onPick={() => setPicked('B')}
        >
          <CardB />
        </Card>

        <Card
          name="시안 C"
          tag="상하 edge runner — 빛이 위·아래로 흐름"
          description="얇은 흰색 빛이 위 테두리를 좌→우로, 아래 테두리를 우→좌로 교차해서 흐름. 카드 외곽이 살아있는 느낌."
          picked={picked === 'C'}
          onPick={() => setPicked('C')}
        >
          <CardC />
        </Card>

        <Card
          name="시안 D"
          tag="외곽 halo — 부드러운 후광 호흡"
          description="카드 바깥에 옅은 푸른빛(silver+blue) 후광이 깔리고 4.5초 주기로 호흡하듯 강도가 변함. 카드 자체에 변화가 없어 가독성 보존."
          picked={picked === 'D'}
          onPick={() => setPicked('D')}
        >
          <CardD />
        </Card>

        <Card
          name="시안 E"
          tag="Hover-only — 평소 완전 정적"
          description="평소엔 일반 카드. 마우스 호버 시에만 빛이 한 번 휘 지나가고 그림자가 살짝 생김. 정보 가독성 최우선."
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
          opacity: 0.85;
        }
        .shimmer-a:hover::before { opacity: 1; }
        @keyframes shimmer-a-spin {
          to { transform: rotate(360deg); }
        }

        /* 시안 B: 대각선 sweep — 더 강하게 */
        .shimmer-b {
          position: relative;
          overflow: hidden;
        }
        .shimmer-b::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: -50%;
          width: 60%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255, 255, 255, 0.0) 30%,
            rgba(255, 255, 255, 0.85) 50%,
            rgba(255, 255, 255, 0.0) 70%,
            transparent 100%
          );
          filter: blur(2px);
          animation: shimmer-b-sweep 4s ease-in-out infinite;
          pointer-events: none;
        }
        .shimmer-b:hover::before { animation-duration: 2.5s; }
        @keyframes shimmer-b-sweep {
          0%   { left: -60%; }
          50%  { left: 110%; }
          100% { left: 110%; }
        }

        /* 시안 C: 상하 edge runner — 가는 빛이 위·아래 테두리를 따라 흐름 */
        .shimmer-c {
          position: relative;
          overflow: hidden;
        }
        .shimmer-c::before,
        .shimmer-c::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 25%,
            rgba(255, 255, 255, 0.95) 50%,
            transparent 75%,
            transparent 100%
          );
          filter: blur(0.5px);
          pointer-events: none;
        }
        .shimmer-c::before {
          top: 0;
          animation: shimmer-c-top 4s ease-in-out infinite;
        }
        .shimmer-c::after {
          bottom: 0;
          animation: shimmer-c-bottom 4s ease-in-out infinite;
          animation-delay: 2s;
        }
        @keyframes shimmer-c-top {
          0%   { transform: translateX(-60%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(60%); opacity: 0; }
        }
        @keyframes shimmer-c-bottom {
          0%   { transform: translateX(60%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(-60%); opacity: 0; }
        }

        /* 시안 D: 외곽 halo — 카드 바깥에 부드러운 푸른빛 후광이 호흡 */
        .shimmer-d {
          position: relative;
        }
        .shimmer-d::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          background: linear-gradient(
            135deg,
            rgba(180, 200, 230, 0.4) 0%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(180, 200, 230, 0.4) 100%
          );
          filter: blur(8px);
          animation: shimmer-d-pulse 4.5s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }
        .shimmer-d:hover::before {
          animation-duration: 2.5s;
        }
        @keyframes shimmer-d-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.02); }
        }

        /* 시안 E: hover-only sweep — 평소 정적, 마우스 올리면 빛이 한번 휘 지나감 */
        .shimmer-e {
          position: relative;
          overflow: hidden;
          transition: box-shadow 200ms, transform 200ms;
        }
        .shimmer-e::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: -60%;
          width: 60%;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 255, 255, 0.75) 50%,
            transparent 70%
          );
          filter: blur(1px);
          transform: translateX(0);
          transition: left 800ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-e:hover::before { left: 100%; }
        .shimmer-e:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        /* 모바일 감쇠 — 강도 절반 + 속도 1.5배 */
        @media (max-width: 640px) {
          .shimmer-a::before { opacity: 0.55; animation-duration: 8s; }
          .shimmer-b::before { animation-duration: 6s; }
          .shimmer-c::before, .shimmer-c::after { animation-duration: 6s; }
          .shimmer-d::before { animation-duration: 6s; opacity: 0.4 !important; }
        }

        /* 접근성: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .shimmer-a::before, .shimmer-b::before, .shimmer-c::before, .shimmer-c::after,
          .shimmer-d::before, .shimmer-e::before {
            animation: none !important;
            transition: none !important;
            opacity: 0 !important;
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
