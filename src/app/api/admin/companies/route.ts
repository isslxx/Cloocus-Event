import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const OPEN_API_KEY = process.env.COMPANY_API_KEY || 'bee8746f34f2e3e1429a6c29070de77aad56cab9';

// 서버 메모리 캐시 (5분 TTL)
let companyCache: { names: string[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// 외부 API 캐시 (10분 TTL)
const externalCache = new Map<string, { results: string[]; timestamp: number }>();
const EXT_CACHE_TTL = 10 * 60 * 1000;

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

async function searchExternalAPI(query: string): Promise<string[]> {
  const cacheKey = query.toLowerCase();
  const cached = externalCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < EXT_CACHE_TTL) {
    return cached.results;
  }

  try {
    const url = `https://apis.data.go.kr/1160100/service/GetCorpBasicInfoService_V2/getCorpOutline_V2?serviceKey=${encodeURIComponent(OPEN_API_KEY)}&numOfRows=10&resultType=json&corpNm=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];
    const names = list
      .map((item: Record<string, string>) => stripCompanyPrefix(item.corpNm || ''))
      .filter((n: string) => n.length > 0);

    const unique = [...new Set(names)] as string[];
    externalCache.set(cacheKey, { results: unique, timestamp: Date.now() });
    return unique;
  } catch {
    return [];
  }
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

  // 내부 DB 검색
  const allNames = await getAllCompanyNames();
  const internalResults = fuzzyMatch(strippedQ, allNames);

  // 내부 결과가 충분하면 바로 반환
  if (internalResults.length >= 5) {
    return NextResponse.json({ results: internalResults, source: 'internal' });
  }

  // 부족하면 외부 API 병행 검색
  const externalResults = await searchExternalAPI(strippedQ);

  // 병합 + 중복 제거
  const seen = new Set(internalResults.map((n) => n.toLowerCase()));
  const merged = [...internalResults];
  for (const name of externalResults) {
    if (!seen.has(name.toLowerCase())) {
      merged.push(name);
      seen.add(name.toLowerCase());
    }
  }

  return NextResponse.json({
    results: merged.slice(0, 10),
    source: internalResults.length > 0 ? 'internal' : externalResults.length > 0 ? 'external' : 'none',
  });
}

// 수동 입력 회사 등록
export async function POST(req: NextRequest) {
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
