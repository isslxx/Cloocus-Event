// 내부 IP 필터 — GA/트래킹 데이터에서 내부 트래픽 제외
//
// 단일 IP뿐 아니라 CIDR 대역(예: 203.0.113.0/24)도 지원
// 본인 PC + 회사 사무실 NAT 출구 IP 대역 등을 함께 등록하면 GA4·page_events 양쪽에서 차단됨

// 하드코딩된 내부 IP/대역 목록. 변경 시 이 파일 수정 후 배포.
// 환경 변수 INTERNAL_IPS(콤마 구분)로도 확장 가능. CIDR 표기 허용.
const HARDCODED_INTERNAL_IPS: string[] = [
  '112.217.166.10',
  // 예: '203.0.113.0/24',  // 회사 사무실 NAT 대역
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

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = Number(p);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = (n << 8) + x;
  }
  return n >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : ((0xffffffff << (32 - bits)) >>> 0);
  return (ipInt & mask) === (baseInt & mask);
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
  for (const entry of getInternalIps()) {
    if (entry.includes('/')) {
      if (inCidr(n, entry)) return true;
    } else if (entry === n) {
      return true;
    }
  }
  return false;
}

export function isInternalRequest(headers: Headers): boolean {
  return isInternalIp(getClientIp(headers));
}
