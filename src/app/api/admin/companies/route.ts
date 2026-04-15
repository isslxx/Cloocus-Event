import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';
import { getAdminFromToken } from '@/lib/supabase-auth';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const DART_API_KEY = process.env.COMPANY_API_KEY || 'bee8746f34f2e3e1429a6c29070de77aad56cab9';

// 내부 DB 캐시 (5분 TTL)
let companyCache: { names: string[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// DART 기업 목록 캐시 (1시간 TTL - 11만건 메모리 보관)
let dartCache: { names: string[]; timestamp: number } | null = null;
const DART_CACHE_TTL = 60 * 60 * 1000;

function stripCompanyPrefix(name: string): string {
  return name
    .replace(/^\s*\(주\)\s*/g, '')
    .replace(/\s*\(주\)\s*$/g, '')
    .replace(/^\s*주식회사\s*/g, '')
    .replace(/\s*주식회사\s*$/g, '')
    .replace(/^\s*\(유\)\s*/g, '')
    .replace(/\s*\(유\)\s*$/g, '')
    .replace(/^\s*유한회사\s*/g, '')
    .replace(/\s*유한회사\s*$/g, '')
    .trim();
}

async function getAllCompanyNames(): Promise<string[]> {
  if (companyCache && Date.now() - companyCache.timestamp < CACHE_TTL) {
    return companyCache.names;
  }

  const supabase = getServiceSupabase();
  const [companiesRes, aliasesRes] = await Promise.all([
    supabase.from('companies').select('name, official_name').order('name'),
    supabase.from('company_aliases').select('alias_name, companies(name, official_name)'),
  ]);

  const nameSet = new Map<string, string>();

  for (const c of companiesRes.data || []) {
    const display = stripCompanyPrefix(c.official_name || c.name);
    nameSet.set(display.toLowerCase(), display);
  }

  for (const a of aliasesRes.data || []) {
    const company = a.companies as unknown as { name: string; official_name: string } | null;
    if (company) {
      const display = stripCompanyPrefix(company.official_name || company.name);
      nameSet.set(a.alias_name.toLowerCase(), display);
    }
  }

  const names = [...new Set(nameSet.values())];
  companyCache = { names, timestamp: Date.now() };
  return names;
}

// DART 전체 기업코드 XML에서 회사명 목록 로드
async function getDartCompanyNames(): Promise<string[]> {
  if (dartCache && Date.now() - dartCache.timestamp < DART_CACHE_TTL) {
    return dartCache.names;
  }

  try {
    const res = await fetch(
      `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_API_KEY}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return dartCache?.names || [];

    const buffer = await res.arrayBuffer();

    // ZIP 해제 - corpCode.xml 추출
    const zipData = new Uint8Array(buffer);
    const names = parseCorpNamesFromZip(zipData);

    dartCache = { names, timestamp: Date.now() };
    return names;
  } catch {
    return dartCache?.names || [];
  }
}

// 간이 ZIP 파서 (단일 파일 ZIP 전용)
function parseCorpNamesFromZip(zip: Uint8Array): string[] {
  // ZIP local file header: 50 4B 03 04
  // Find compressed data and use DecompressionStream
  const names: string[] = [];

  try {
    // Local file header 파싱
    const view = new DataView(zip.buffer);
    if (view.getUint32(0, true) !== 0x04034b50) return [];

    const compressedSize = view.getUint32(18, true);
    const fileNameLen = view.getUint16(26, true);
    const extraLen = view.getUint16(28, true);
    const dataOffset = 30 + fileNameLen + extraLen;
    const compressionMethod = view.getUint16(8, true);

    let xmlText: string;

    if (compressionMethod === 0) {
      // 비압축
      xmlText = new TextDecoder('utf-8').decode(zip.slice(dataOffset, dataOffset + compressedSize));
    } else {
      // Deflate 압축 해제 (동기 방식 - 서버에서 실행)
      // DecompressionStream은 브라우저 API이므로 서버에서는 다른 방법 필요
      // raw deflate → zlib inflate 사용
      const { inflateRawSync } = require('zlib');
      const compressed = zip.slice(dataOffset, dataOffset + compressedSize);
      const decompressed = inflateRawSync(Buffer.from(compressed));
      xmlText = decompressed.toString('utf-8');
    }

    // 간단 XML 파싱 - <corp_name>...</corp_name> 추출
    const regex = /<corp_name>([^<]+)<\/corp_name>/g;
    let match;
    const seen = new Set<string>();
    while ((match = regex.exec(xmlText)) !== null) {
      const raw = match[1].trim();
      if (!raw) continue;
      const clean = stripCompanyPrefix(raw);
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        names.push(clean);
      }
    }
  } catch {
    // 파싱 실패 시 빈 배열
  }

  return names;
}

function fuzzyMatch(query: string, names: string[]): string[] {
  const q = query.toLowerCase();
  const exact: string[] = [];
  const startsWith: string[] = [];
  const contains: string[] = [];

  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower === q) { exact.push(name); continue; }
    if (lower.startsWith(q)) { startsWith.push(name); continue; }
    if (lower.includes(q)) { contains.push(name); continue; }
  }

  return [...exact, ...startsWith, ...contains].slice(0, 10);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], source: 'none' });
  }

  const strippedQ = stripCompanyPrefix(q);

  // 내부 DB + DART 병렬 검색
  const [internalNames, dartNames] = await Promise.all([
    getAllCompanyNames(),
    getDartCompanyNames(),
  ]);

  const internalResults = fuzzyMatch(strippedQ, internalNames);

  // 내부 결과가 충분하면 바로 반환
  if (internalResults.length >= 10) {
    return NextResponse.json({ results: internalResults, source: 'internal' });
  }

  // DART에서 추가 검색
  const dartResults = fuzzyMatch(strippedQ, dartNames);

  // 병합 + 중복 제거 (내부 우선)
  const seen = new Set(internalResults.map((n) => n.toLowerCase()));
  const merged = [...internalResults];
  for (const name of dartResults) {
    if (!seen.has(name.toLowerCase())) {
      merged.push(name);
      seen.add(name.toLowerCase());
    }
    if (merged.length >= 10) break;
  }

  return NextResponse.json({
    results: merged.slice(0, 10),
    source: internalResults.length > 0 ? 'internal' : merged.length > 0 ? 'external' : 'none',
  });
}

// 회사 등록 (관리자 전용)
export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const normalized = normalizeCompanyName(name);

  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', normalized)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, name: existing.name, status: 'existing' });
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({ name: normalized, official_name: stripCompanyPrefix(name.trim()), status: 'unverified' })
    .select('id, name')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  companyCache = null;

  return NextResponse.json({ id: data?.id, name: data?.name, status: 'created' });
}
