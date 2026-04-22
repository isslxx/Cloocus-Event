// 산업군 표시 라벨 변환
// 정책:
// - 차트(도넛): 괄호 안 내용 생략하여 요약된 라벨로 집계 (예: "금융(은행)" → "금융")
// - 테이블: 원본 값 그대로 표시
// - "기타: XXX" 형식(사용자 직접 입력)은 차트에서 "기타"로 통합

export function toChartLabel(industry: string | null | undefined): string {
  if (!industry) return '미지정';
  const s = industry.trim();
  if (!s) return '미지정';

  // "기타: 스타트업" 같이 사용자 입력 산업 → 차트에서는 "기타"
  const colonIdx = s.indexOf(':');
  if (colonIdx > 0 && s.slice(0, colonIdx).trim() === '기타') return '기타';

  // 반각 괄호 "금융(은행)" → "금융"
  const paren = s.indexOf('(');
  if (paren > 0) return s.slice(0, paren).trim() || s;

  // 전각 괄호 "금융（은행）" → "금융"
  const fullParen = s.indexOf('（');
  if (fullParen > 0) return s.slice(0, fullParen).trim() || s;

  return s;
}
