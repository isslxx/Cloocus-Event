// 내부 IP 필터 — GA/트래킹 데이터에서 내부 트래픽 제외

// 하드코딩된 내부 IP 목록. 추가/변경 시 이 파일 수정.
// 환경 변수 INTERNAL_IPS(콤마 구분)로도 확장 가능.
const HARDCODED_INTERNAL_IPS: string[] = [
  '112.217.166.10',
];

function getEnvIps(): string[] {
  const env = process.env.INTERNAL_IPS || '';
  return env.split(',').map((s) => s.trim()).filter(Boolean);
}

function normalizeIp(ip: string | null | undefined): string {
  if (!ip) return '';
  let v = ip.trim();
  // IPv4-mapped IPv6: ::ffff:1.2.3.4 → 1.2.3.4
  if (v.startsWith('::ffff:')) v = v.slice(7);
  return v;
}

export function getInternalIps(): string[] {
  return [...HARDCODED_INTERNAL_IPS, ...getEnvIps()];
}

export function getClientIp(headers: Headers): string {
  // 프록시(CF / Vercel / NGINX) 경유 시 최초 클라이언트 IP는 x-forwarded-for의 첫 번째 토큰
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    return normalizeIp(first);
  }
  return normalizeIp(headers.get('x-real-ip') || headers.get('cf-connecting-ip') || '');
}

export function isInternalIp(ip: string | null | undefined): boolean {
  const n = normalizeIp(ip);
  if (!n) return false;
  return getInternalIps().includes(n);
}

export function isInternalRequest(headers: Headers): boolean {
  return isInternalIp(getClientIp(headers));
}
