'use client';

// 임시 시안 비교 페이지 — 사용자가 "프로모션 상세보기" 디자인을 선택하면 삭제 예정.
// /[slug] 페이지 상단의 이벤트 정보 박스 우측에 들어갈 링크/버튼 디자인.
// 각 시안에서 신청자 폼 상단 박스를 그대로 재현해서 비교.

import { useState } from 'react';

const EVENT = {
  name: 'Gemini Enterprise 맞춤 견적 문의',
  date: '2026년 6월 30일 (화)',
  type: 'online' as 'online' | 'offline',
  capacity: null as number | null,
  category: '프로모션',
  promo_url: 'https://example.com/promotion',
};

type Variant = 'A' | 'B' | 'C' | 'D' | 'E';

export default function PromoLinkPreview() {
  const [picked, setPicked] = useState<Variant | null>(null);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">&ldquo;프로모션 상세보기&rdquo; 디자인 시안</h1>
        <p className="text-sm text-gray-500 mt-1">
          신청자 등록 페이지의 이벤트 정보 박스 우측 상단(이벤트 타입 토글과 같은 레벨)에 들어갈 링크 디자인 5가지를 비교해.
          마음에 드는 시안을 채팅으로 알려주면 적용하고 이 페이지는 삭제할게.
        </p>
      </header>

      <div className="space-y-6">
        <Card
          name="시안 A"
          tag="유리 같은 라이트 칩"
          description="가벼운 흰색 칩 위에 외부 링크 아이콘. 신청 흐름을 방해하지 않고 부드럽게 발견 가능. 호버 시 살짝 떠오름."
          picked={picked === 'A'}
          onPick={() => setPicked('A')}
        >
          <EventInfoBox event={EVENT} link={<LinkA url={EVENT.promo_url} />} />
        </Card>

        <Card
          name="시안 B"
          tag="포인트 컬러 텍스트 링크"
          description="아이콘 없이 깔끔한 보라색/블루 톤 텍스트 링크 + 작은 외부 링크 아이콘. 가장 미니멀하고 텍스트 읽기 흐름과 잘 어우러짐."
          picked={picked === 'B'}
          onPick={() => setPicked('B')}
        >
          <EventInfoBox event={EVENT} link={<LinkB url={EVENT.promo_url} />} />
        </Card>

        <Card
          name="시안 C"
          tag="그라디언트 프리미엄 버튼"
          description="브랜드 컬러 그라디언트 + 외부 링크 아이콘. 시각적 무게감이 있어 클릭 유도 강함. 프로모션의 '특별함' 강조에 효과적."
          picked={picked === 'C'}
          onPick={() => setPicked('C')}
        >
          <EventInfoBox event={EVENT} link={<LinkC url={EVENT.promo_url} />} />
        </Card>

        <Card
          name="시안 D"
          tag="아웃라인 + 화살표"
          description="얇은 아웃라인 버튼. 우측 화살표가 호버 시 살짝 이동. 차분하고 정돈된 느낌. B2B 톤에 잘 맞음."
          picked={picked === 'D'}
          onPick={() => setPicked('D')}
        >
          <EventInfoBox event={EVENT} link={<LinkD url={EVENT.promo_url} />} />
        </Card>

        <Card
          name="시안 E"
          tag="배지형 인라인 링크"
          description="이벤트 타입 토글들과 같은 모양·높이의 배지 안에 링크 아이콘 + 텍스트. 다른 메타 정보와 시각적으로 통일됨."
          picked={picked === 'E'}
          onPick={() => setPicked('E')}
        >
          <EventInfoBox event={EVENT} link={<LinkE url={EVENT.promo_url} />} />
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>선택 안내:</strong> &quot;시안 C 로 가자&quot; 같이 알려주면 /[slug] 페이지에 적용하고 이 미리보기 페이지는 정리할게.
        </p>
        {picked && (
          <p className="text-sm font-semibold text-blue-700 mt-2">
            현재 표시된 선호: <span className="px-2 py-0.5 bg-white rounded">시안 {picked}</span>
            <span className="text-xs text-gray-500 ml-2">(이 화면에서 비교용으로만 — 실제 적용은 채팅으로)</span>
          </p>
        )}
      </div>
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
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

// ============== 신청자 폼 상단 이벤트 정보 박스 (실제와 동일하게 재현) ==============
function EventInfoBox({ event, link }: { event: typeof EVENT; link: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl px-5 py-4" style={{ backgroundColor: '#e0f2fe' }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-gray-900 flex-1">{event.name}</p>
        {/* 시안 A·D·E 의 일부는 우측 상단에 별도 자리 차지 */}
      </div>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className="text-sm text-gray-500">기한: {event.date}</span>
        {event.type === 'online' && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Online</span>
        )}
        {event.capacity && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">정원 {event.capacity}명</span>
        )}
        {/* 우측 상단(같은 레벨)에 링크 */}
        <span className="ml-auto">{link}</span>
      </div>
    </div>
  );
}

const ICON_EXT = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7M21 3l-9 9M5 5h6v2H7v10h10v-4h2v6H5z" />
  </svg>
);

// ============== A: 라이트 칩 ==============
function LinkA({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-700 hover:border-blue-400 hover:shadow-sm transition"
    >
      {ICON_EXT}
      프로모션 상세보기
    </a>
  );
}

// ============== B: 텍스트 링크 ==============
function LinkB({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition"
    >
      프로모션 상세보기
      {ICON_EXT}
    </a>
  );
}

// ============== C: 그라디언트 ==============
function LinkC({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full text-white shadow-sm hover:shadow-md hover:brightness-110 transition"
      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
    >
      {ICON_EXT}
      프로모션 상세보기
    </a>
  );
}

// ============== D: 아웃라인 + 화살표 ==============
function LinkD({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:text-gray-900 transition"
    >
      프로모션 상세보기
      <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  );
}

// ============== E: 배지형 ==============
function LinkE({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
    >
      {ICON_EXT}
      프로모션 상세보기
    </a>
  );
}
