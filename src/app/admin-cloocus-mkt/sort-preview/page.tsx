'use client';

// 임시 시안 비교 페이지 — 사용자가 정렬 아이콘 디자인을 선택한 뒤 삭제 예정.
// 등록 리스트와 똑같은 형태의 헤더+더미 행으로 3가지 시안을 한 화면에 나란히 비교.

import { useState } from 'react';

type SortKey = 'name' | 'company_name' | 'created_at' | 'event' | 'department' | 'job_title' | 'email' | 'phone' | 'industry' | 'company_size';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name',         label: '성함' },
  { key: 'company_name', label: '회사명' },
  { key: 'created_at',   label: '등록일' },
  { key: 'event',        label: '이벤트' },
  { key: 'department',   label: '부서명' },
  { key: 'job_title',    label: '직급' },
  { key: 'email',        label: '이메일' },
  { key: 'phone',        label: '연락처' },
  { key: 'industry',     label: '산업군' },
  { key: 'company_size', label: '기업 규모' },
];

const SAMPLE_ROWS = [
  { name: '김현우', company_name: '삼성SDS',     created_at: '2026-05-08 14:32', event: 'Copilot Hands-on', department: '개발팀',     job_title: '대리',  email: 'kim@sds.com',     phone: '010-1234-5678', industry: 'IT/소프트웨어', company_size: '대기업'   },
  { name: '이지은', company_name: 'LG CNS',     created_at: '2026-05-07 09:15', event: 'Copilot Hands-on', department: '클라우드본부', job_title: '책임',  email: 'lee@cns.com',     phone: '010-2345-6789', industry: 'IT/소프트웨어', company_size: '대기업'   },
  { name: '박민수', company_name: '네이버',      created_at: '2026-05-06 17:48', event: 'Gemini 프로모션',   department: 'AI리서치',    job_title: '연구원', email: 'park@naver.com',  phone: '010-3456-7890', industry: 'IT/소프트웨어', company_size: '대기업'   },
  { name: '최서연', company_name: '카카오',      created_at: '2026-05-05 11:22', event: 'Gemini 프로모션',   department: '플랫폼팀',     job_title: '매니저', email: 'choi@kakao.com',  phone: '010-4567-8901', industry: 'IT/소프트웨어', company_size: '대기업'   },
];

type Variant = 'A' | 'B' | 'C' | 'D';

export default function SortPreviewPage() {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">정렬 아이콘 디자인 시안</h1>
        <p className="text-sm text-gray-500 mt-1">
          세 가지 시안을 비교해보고 마음에 드는 것을 알려줘. 컬럼 헤더를 클릭해서 정렬 동작도 직접 확인 가능.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          현재 정렬: <span className="font-medium">{COLUMNS.find((c) => c.key === sortKey)?.label}</span> {sortAsc ? '오름차순' : '내림차순'}
        </p>
      </div>

      <div className="space-y-8">
        <Variant
          name="시안 A"
          tag="활성 컬럼만 표시 (가장 깔끔)"
          description="평상시엔 아이콘 없음. 정렬 중인 컬럼만 작은 ▼/▲ + 파란색 텍스트. 호버 시 배경 살짝 강조."
          isActive={activeVariant === 'A'}
          onPick={() => setActiveVariant('A')}
        >
          <HeaderA columns={COLUMNS} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
          <BodyRows />
        </Variant>

        <Variant
          name="시안 B"
          tag="스택형 캐럿 (데이터 테이블 표준)"
          description="모든 컬럼에 위·아래 캐럿 한 쌍. 활성 컬럼은 해당 방향만 진한 파란색, 다른 컬럼은 옅은 회색."
          isActive={activeVariant === 'B'}
          onPick={() => setActiveVariant('B')}
        >
          <HeaderB columns={COLUMNS} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
          <BodyRows />
        </Variant>

        <Variant
          name="시안 C"
          tag="배경 강조 + 컴팩트 화살표"
          description="아이콘 의존도 낮춤. 활성 컬럼은 옅은 파란 배경 + 굵은 텍스트 + 작은 ↑/↓. 비활성은 그냥 텍스트."
          isActive={activeVariant === 'C'}
          onPick={() => setActiveVariant('C')}
        >
          <HeaderC columns={COLUMNS} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
          <BodyRows />
        </Variant>

        <Variant
          name="시안 D"
          tag="Excel 스타일 — 헤더 우측 ▼ + 세로 구분선"
          description="모든 헤더 우측에 작은 드롭다운 캐럿이 항상 표시 (Excel 필터 버튼 스타일). 활성 컬럼은 시안 A처럼 파란색으로 강조되고 ▼이 ↓/↑로 변환. 모든 셀에 세로 구분선 추가."
          isActive={activeVariant === 'D'}
          onPick={() => setActiveVariant('D')}
        >
          <HeaderD columns={COLUMNS} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
          <BodyRowsD />
        </Variant>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>선택 후 안내:</strong> &quot;시안 A 로 가자&quot; 처럼 알려주면 등록 리스트와 프로모션 리스트에 적용 후 이 미리보기 페이지는 삭제할게.
        </p>
        {activeVariant && (
          <p className="text-sm font-semibold text-blue-700 mt-2">
            현재 표시된 선호: <span className="px-2 py-0.5 bg-white rounded">시안 {activeVariant}</span>
            <span className="text-xs text-gray-500 ml-2">(이 화면에서 비교용으로만 표시 — 실제 적용은 채팅으로 알려줘)</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Variant({ name, tag, description, isActive, onPick, children }: {
  name: string;
  tag: string;
  description: string;
  isActive: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-white rounded-xl border-2 transition ${isActive ? 'border-blue-400 shadow-md' : 'border-gray-200'}`}>
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900">{name} <span className="text-xs font-normal text-gray-500 ml-2">{tag}</span></h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={onPick}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isActive ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
        >
          {isActive ? '✓ 선호 표시됨' : '이 시안 선호'}
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    </section>
  );
}

// ============ 시안 A: 활성 컬럼만 ▼/▲ + 파란색 ============
function HeaderA({ columns, sortKey, sortAsc, onSort }: {
  columns: { key: SortKey; label: string }[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {columns.map((col) => {
          const isSorted = sortKey === col.key;
          return (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`px-4 py-3 text-left font-medium cursor-pointer whitespace-nowrap select-none transition
                ${isSorted ? 'text-blue-700 bg-blue-50/40' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {isSorted && (
                  <span className="text-[10px] leading-none">{sortAsc ? '▲' : '▼'}</span>
                )}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

// ============ 시안 B: 스택형 캐럿 항상 표시 ============
function HeaderB({ columns, sortKey, sortAsc, onSort }: {
  columns: { key: SortKey; label: string }[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {columns.map((col) => {
          const isSorted = sortKey === col.key;
          const upActive = isSorted && sortAsc;
          const downActive = isSorted && !sortAsc;
          return (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`px-4 py-3 text-left font-medium cursor-pointer whitespace-nowrap select-none transition
                ${isSorted ? 'text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {col.label}
                <span className="inline-flex flex-col leading-[8px] text-[8px]" aria-hidden="true">
                  <span className={upActive ? 'text-blue-600' : 'text-gray-300'}>▲</span>
                  <span className={downActive ? 'text-blue-600' : 'text-gray-300'}>▼</span>
                </span>
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

// ============ 시안 C: 배경 강조 + 컴팩트 화살표 ============
function HeaderC({ columns, sortKey, sortAsc, onSort }: {
  columns: { key: SortKey; label: string }[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {columns.map((col) => {
          const isSorted = sortKey === col.key;
          return (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`px-4 py-3 text-left cursor-pointer whitespace-nowrap select-none transition
                ${isSorted ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 font-medium hover:bg-gray-100'}`}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {isSorted && (
                  <span className="text-xs">{sortAsc ? '↑' : '↓'}</span>
                )}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

// 공용 더미 본문
function BodyRows() {
  return (
    <tbody>
      {SAMPLE_ROWS.map((r, i) => (
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-3 font-medium">{r.name}</td>
          <td className="px-4 py-3">{r.company_name}</td>
          <td className="px-4 py-3 text-gray-500 text-xs">{r.created_at}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.event}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.department}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.job_title}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.email}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.phone}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.industry}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.company_size}</td>
        </tr>
      ))}
    </tbody>
  );
}

// ============ 시안 D: Excel 스타일 헤더 ▼ + 세로 구분선 ============
function HeaderD({ columns, sortKey, sortAsc, onSort }: {
  columns: { key: SortKey; label: string }[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {columns.map((col) => {
          const isSorted = sortKey === col.key;
          return (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`px-4 py-3 text-left font-medium cursor-pointer whitespace-nowrap select-none transition border-r border-gray-200 last:border-r-0
                ${isSorted ? 'text-blue-700 bg-blue-50/40' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="inline-flex items-center justify-between gap-2 w-full">
                <span>{col.label}</span>
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] leading-none border transition
                    ${isSorted
                      ? 'border-blue-300 bg-white text-blue-600'
                      : 'border-gray-300 bg-white text-gray-400 group-hover:text-gray-600'}`}
                  aria-hidden="true"
                >
                  {isSorted ? (sortAsc ? '▲' : '▼') : '▼'}
                </span>
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

// 시안 D 전용 본문: 셀에도 세로 구분선
function BodyRowsD() {
  return (
    <tbody>
      {SAMPLE_ROWS.map((r, i) => (
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-3 font-medium border-r border-gray-100">{r.name}</td>
          <td className="px-4 py-3 border-r border-gray-100">{r.company_name}</td>
          <td className="px-4 py-3 text-gray-500 text-xs border-r border-gray-100">{r.created_at}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.event}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.department}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.job_title}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.email}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.phone}</td>
          <td className="px-4 py-3 text-gray-600 text-xs border-r border-gray-100">{r.industry}</td>
          <td className="px-4 py-3 text-gray-600 text-xs">{r.company_size}</td>
        </tr>
      ))}
    </tbody>
  );
}
