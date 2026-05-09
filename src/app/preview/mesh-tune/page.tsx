'use client';

import { useState } from 'react';

type Variant = {
  id: string;
  label: string;
  description: string;
  blobs: { color: string; opacity: number }[];
};

const variants: Variant[] = [
  {
    id: 'A',
    label: 'A. 현재 (baseline)',
    description: '4색 / opacity 0.45·0.4·0.35·0.4',
    blobs: [
      { color: '#c4b5fd', opacity: 0.45 },
      { color: '#a5f3fc', opacity: 0.4 },
      { color: '#fed7aa', opacity: 0.35 },
      { color: '#bae6fd', opacity: 0.4 },
    ],
  },
  {
    id: 'B',
    label: 'B. opacity 감소',
    description: '4색 유지 / opacity 0.30·0.26·0.20·0.26',
    blobs: [
      { color: '#c4b5fd', opacity: 0.3 },
      { color: '#a5f3fc', opacity: 0.26 },
      { color: '#fed7aa', opacity: 0.2 },
      { color: '#bae6fd', opacity: 0.26 },
    ],
  },
  {
    id: 'C',
    label: 'C. 피치 → 민트 (전부 쿨톤)',
    description: '피치를 민트로 교체',
    blobs: [
      { color: '#c4b5fd', opacity: 0.45 },
      { color: '#a5f3fc', opacity: 0.4 },
      { color: '#bbf7d0', opacity: 0.35 },
      { color: '#bae6fd', opacity: 0.4 },
    ],
  },
  {
    id: 'D',
    label: 'D. 둘 다 (opacity ↓ + 피치 → 민트)',
    description: '쿨톤 + 흐릿하게',
    blobs: [
      { color: '#c4b5fd', opacity: 0.3 },
      { color: '#a5f3fc', opacity: 0.26 },
      { color: '#bbf7d0', opacity: 0.2 },
      { color: '#bae6fd', opacity: 0.26 },
    ],
  },
];

const blobPositions = [
  { width: '50vw', height: '50vw', top: '-10%', left: '-10%', maxWidth: 700, maxHeight: 700 },
  { width: '45vw', height: '45vw', top: '5%', right: '-10%', maxWidth: 650, maxHeight: 650 },
  { width: '50vw', height: '50vw', bottom: '-15%', left: '20%', maxWidth: 700, maxHeight: 700 },
  { width: '35vw', height: '35vw', bottom: '10%', right: '5%', maxWidth: 500, maxHeight: 500 },
];

export default function MeshTunePreview() {
  const [active, setActive] = useState('B');
  const v = variants.find((x) => x.id === active) || variants[0];

  return (
    <div className="min-h-screen relative">
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {v.blobs.map((b, i) => {
          const pos = blobPositions[i];
          return (
            <div
              key={`${v.id}-${i}`}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                filter: 'blur(70px)',
                background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                opacity: b.opacity,
                ...pos,
              }}
            />
          );
        })}
      </div>

      <header className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-lg px-3 py-2 flex flex-wrap gap-1.5 max-w-[92vw]">
        {variants.map((x) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              active === x.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={x.description}
          >
            {x.label}
          </button>
        ))}
      </header>

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cloocus-logo.png" alt="Cloocus" className="h-6 mx-auto mb-5" />
              <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트</h1>
              <p className="text-gray-500 text-center mb-8">참여하실 이벤트를 선택해주세요.</p>

              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-xl px-4 py-4 bg-white hover:border-gray-300 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {i === 1 ? '세미나' : i === 2 ? '워크숍' : '프로모션'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                      샘플 이벤트 카드 #{i}
                    </h3>
                    <p className="text-xs text-gray-500">
                      이벤트 카드의 가독성과 mesh 컬러 영향을 비교하기 위한 샘플
                    </p>
                  </div>
                ))}
              </div>

              <button className="register-btn w-full mt-6">
                <span>이벤트 등록하기</span>
              </button>
            </div>

            <div className="mt-6 bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">현재 시안</p>
              <p className="text-sm font-semibold text-gray-900">{v.label}</p>
              <p className="text-xs text-gray-500 mt-1">{v.description}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-200 py-4 px-4 text-center">
          <p className="text-xs text-gray-500">
            mesh 시안 비교 · 상단 버튼으로 전환
          </p>
        </div>
      </div>
    </div>
  );
}
