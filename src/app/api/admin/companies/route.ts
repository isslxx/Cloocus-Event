import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// 서버 메모리 캐시 (5분 TTL)
let companyCache: { names: string[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

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
    const display = c.official_name || c.name;
    nameSet.set(display.toLowerCase(), display);
  }

  for (const a of aliasesRes.data || []) {
    const company = a.companies as unknown as { name: string; official_name: string } | null;
    if (company) {
      const display = company.official_name || company.name;
      // alias를 키로, 실제 회사명을 값으로
      nameSet.set(a.alias_name.toLowerCase(), display);
    }
  }

  const names = [...new Set(nameSet.values())];
  companyCache = { names, timestamp: Date.now() };
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

  const allNames = await getAllCompanyNames();
  const results = fuzzyMatch(q, allNames);

  return NextResponse.json({
    results,
    source: results.length > 0 ? 'internal' : 'none',
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
    .insert({ name: normalized, official_name: name.trim(), status: 'unverified' })
    .select('id, name')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 캐시 무효화
  companyCache = null;

  return NextResponse.json({ id: data?.id, name: data?.name, status: 'created' });
}
