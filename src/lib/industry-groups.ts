// 산업군 상세값 → 요약 그룹 매핑
// - 차트(도넛)에는 그룹명만 표시 (8~10개로 제한 → 가독성)
// - 테이블에는 원본 industry 값 전체 표시
// 원본 값은 constants.ts의 INDUSTRIES 및 "기타: xxx" 형식을 포함

export const INDUSTRY_GROUPS = [
  'IT',
  '제조',
  '유통',
  '바이오',
  '서비스',
  '금융',
  '공공',
  '미디어',
  '건설',
  '에너지',
  '1차산업',
  '기타',
] as const;

export type IndustryGroup = (typeof INDUSTRY_GROUPS)[number];

const DIRECT_MAP: Record<string, IndustryGroup> = {
  'IT/통신': 'IT',
  '게임': 'IT',
  '제조/산업': '제조',
  '유통/물류': '유통',
  '헬스케어/바이오': '바이오',
  '농축산업': '1차산업',
  '서비스': '서비스',
  '금융': '금융',
  '에너지/자원': '에너지',
  '공공/교육': '공공',
  '미디어/엔터테인먼트': '미디어',
  '건설/부동산': '건설',
  '기타': '기타',
};

export function toIndustryGroup(industry: string | null | undefined): IndustryGroup {
  if (!industry) return '기타';
  const trimmed = industry.trim();
  if (DIRECT_MAP[trimmed]) return DIRECT_MAP[trimmed];
  if (trimmed.startsWith('기타: ') || trimmed.startsWith('기타:')) return '기타';
  return '기타';
}
