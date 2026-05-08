'use client';

// 임시 시안 비교 페이지 — 사용자가 shimmer 디자인을 선택하면 삭제 예정.
// 신청자 포탈 홈 화면의 이벤트 카드 UI 에 적용할 효과 5종을 완전히 다른 컨셉으로 비교.

import { useState } from 'react';

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
        <h1 className="text-2xl font-bold">이벤트 카드 모션 디자인 시안 (재구성)</h1>
        <p className="text-sm text-gray-500 mt-1">
          5가지를 완전히 다른 컨셉으로 재설계. 강도도 인지 가능한 수준으로 올림. 마음에 드는 시안을 채팅으로 알려주면 적용 + 페이지 정리.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          공통: prefers-reduced-motion 자동 비활성화 / 모바일 감쇠 / GPU 친화 (transform·opacity 위주) / 카드 본문 가독성 보존
        </p>
      </header>

      <div className="space-y-6">
        <Card
          name="시안 A"
          tag="네온 보더 회전 — 사이버 프리미엄"
          description="얇은 시안색 빛 줄기가 카드 테두리를 4초 주기로 도는 형태. 어두운 테마/AI 플랫폼 (Vercel, Anthropic) 분위기. 가장 'tech' 한 느낌."
          picked={picked === 'A'}
          onPick={() => setPicked('A')}
        >
          <CardA />
        </Card>

        <Card
          name="시안 B"
          tag="실버 미러 sweep — Apple 메탈 광택"
          description="넓고 밝은 흰색-실버 빛이 카드를 비스듬히 가로지름. 약간의 푸른빛 블러로 메탈 표면 광택 느낌. 가장 '럭셔리' 한 인상."
          picked={picked === 'B'}
          onPick={() => setPicked('B')}
        >
          <CardB />
        </Card>

        <Card
          name="시안 C"
          tag="블루 grad 보더 펄스 — Linear 풍"
          description="카드 보더 자체가 푸른빛 그라데이션으로 회전·펄스. 보더 두께가 살짝 두꺼워지면서 색이 흐름. SaaS 프리미엄 보더 트렌드."
          picked={picked === 'C'}
          onPick={() => setPicked('C')}
        >
          <CardC />
        </Card>

        <Card
          name="시안 D"
          tag="플로팅 orb — 빛 입자가 궤도를 돈다"
          description="작은 푸른빛 입자 하나가 카드 테두리를 천천히 따라 돔. 입자 주변에 부드러운 후광. 가장 'magic' 한 인터랙티브 느낌."
          picked={picked === 'D'}
          onPick={() => setPicked('D')}
        >
          <CardD />
        </Card>

        <Card
          name="시안 E"
          tag="Hover 만 — 정적 카드, 호버 시 풀파워"
          description="평소엔 완전 정적. 호버 시 카드가 살짝 떠오르며 그라데이션 보더 + sweep 빛 동시 발사. 가독성 100%, 인터랙션 시 만족감 극대화."
          picked={picked === 'E'}
          onPick={() => setPicked('E')}
        >
          <CardE />
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>선택 안내:</strong> &quot;시안 D 좋아&quot; 처럼 알려주면 홈 카드 UI 에 적용하고 이 미리보기 페이지는 정리할게.
        </p>
        {picked && (
          <p className="text-sm font-semibold text-blue-700 mt-2">
            현재 표시된 선호: <span className="px-2 py-0.5 bg-white rounded">시안 {picked}</span>
            <span className="text-xs text-gray-500 ml-2">(이 화면에서 비교용으로만 — 실제 적용은 채팅으로)</span>
          </p>
        )}
      </div>

      <style jsx global>{`
        /* ============== 시안 A: 네온 보더 회전 ============== */
        .shimmer-a {
          position: relative;
          isolation: isolate;
        }
        .shimmer-a::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 220deg,
            rgba(56, 189, 248, 0.4) 280deg,
            rgba(96, 165, 250, 0.95) 340deg,
            rgba(255, 255, 255, 1) 355deg,
            rgba(96, 165, 250, 0.95) 360deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: shimmer-a-spin 4s linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 2px rgba(96, 165, 250, 0.4));
        }
        @keyframes shimmer-a-spin { to { transform: rotate(360deg); } }

        /* ============== 시안 B: 실버 미러 sweep ============== */
        .shimmer-b {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
        }
        .shimmer-b::before {
          content: '';
          position: absolute;
          top: -50%; bottom: -50%;
          left: -80%;
          width: 80%;
          background: linear-gradient(
            115deg,
            transparent 10%,
            rgba(186, 207, 236, 0.4) 35%,
            rgba(255, 255, 255, 1) 50%,
            rgba(186, 207, 236, 0.4) 65%,
            transparent 90%
          );
          filter: blur(4px);
          transform: rotate(8deg);
          animation: shimmer-b-sweep 3.5s ease-in-out infinite;
          pointer-events: none;
        }
        .shimmer-b:hover::before { animation-duration: 2s; }
        @keyframes shimmer-b-sweep {
          0%   { left: -80%; }
          60%  { left: 110%; }
          100% { left: 110%; }
        }

        /* ============== 시안 C: 블루 grad 보더 펄스 ============== */
        .shimmer-c {
          position: relative;
          isolation: isolate;
        }
        .shimmer-c::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(
            from var(--ang, 0deg),
            #60a5fa,
            #c084fc,
            #38bdf8,
            #818cf8,
            #60a5fa
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: shimmer-c-rotate 6s linear infinite, shimmer-c-pulse 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        @property --ang { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes shimmer-c-rotate { to { --ang: 360deg; } }
        @keyframes shimmer-c-pulse  {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }

        /* ============== 시안 D: 플로팅 orb ============== */
        .shimmer-d {
          position: relative;
          isolation: isolate;
        }
        .shimmer-d::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          /* offset-path 로 정확히 border 위를 따라 회전 */
          background:
            radial-gradient(circle at center, rgba(96, 165, 250, 1) 0%, rgba(96, 165, 250, 0.6) 30%, transparent 70%);
          width: 14px;
          height: 14px;
          inset: auto;
          top: 0;
          left: 0;
          offset-path: rect(0 100% 100% 0 round var(--orb-radius, 8px));
          offset-distance: 0%;
          offset-anchor: center;
          animation: shimmer-d-orbit 5s linear infinite;
          pointer-events: none;
          filter: blur(1px);
          box-shadow: 0 0 12px 2px rgba(96, 165, 250, 0.5);
        }
        @keyframes shimmer-d-orbit {
          to { offset-distance: 100%; }
        }

        /* ============== 시안 E: hover-only 풀파워 ============== */
        .shimmer-e {
          position: relative;
          overflow: hidden;
          transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms;
        }
        .shimmer-e::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(from 0deg, transparent, #60a5fa, #c084fc, transparent, transparent);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          opacity: 0;
          transition: opacity 250ms;
          pointer-events: none;
        }
        .shimmer-e::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: -60%;
          width: 60%;
          background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.85) 50%, transparent 70%);
          filter: blur(2px);
          transition: left 800ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .shimmer-e:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(96, 165, 250, 0.18), 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        .shimmer-e:hover::before { opacity: 1; animation: shimmer-e-rotate 2.5s linear infinite; }
        .shimmer-e:hover::after  { left: 100%; }
        @keyframes shimmer-e-rotate { to { transform: rotate(360deg); } }

        /* 모바일 감쇠 */
        @media (max-width: 640px) {
          .shimmer-a::before { animation-duration: 6s; }
          .shimmer-b::before { animation-duration: 5s; }
          .shimmer-c::before { animation-duration: 9s, 3.5s; }
          .shimmer-d::before { animation-duration: 7s; }
        }

        /* 접근성: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .shimmer-a::before, .shimmer-b::before, .shimmer-c::before,
          .shimmer-d::before, .shimmer-e::before, .shimmer-e::after {
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
      <div className="p-10 bg-gray-50">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

function CardBody({ extraClass }: { extraClass: string }) {
  return (
    <button
      className={`w-full text-left p-4 rounded-lg border-2 border-gray-200 transition-all bg-white ${extraClass}`}
    >
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
    </button>
  );
}

function CardA() { return <CardBody extraClass="shimmer-a" />; }
function CardB() { return <CardBody extraClass="shimmer-b" />; }
function CardC() { return <CardBody extraClass="shimmer-c" />; }
function CardD() { return <CardBody extraClass="shimmer-d" />; }
function CardE() { return <CardBody extraClass="shimmer-e" />; }
