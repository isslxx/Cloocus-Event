import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCompanyName } from '@/lib/company-normalize';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 내부 DB 검색
async function searchInternal(q: string): Promise<{ name: string; official_name: string; status: string }[]> {
  const supabase = getServiceSupabase();
  const normalized = normalizeCompanyName(q);

  // companies 테이블에서 검색
  const { data: companies } = await supabase
    .from('companies')
    .select('name, official_name, status')
    .or(`name.ilike.%${normalized}%,official_name.ilike.%${q}%`)
    .order('name')
    .limit(10);

  // aliases에서도 검색
  const { data: aliases } = await supabase
    .from('company_aliases')
    .select('alias_name, company_id, companies(name, official_name, status)')
    .ilike('alias_name', `%${q}%`)
    .limit(5);

  const results = new Map<string, { name: string; official_name: string; status: string }>();

  for (const c of companies || []) {
    results.set(c.name, { name: c.name, official_name: c.official_name || c.name, status: c.status || 'verified' });
  }

  for (const a of aliases || []) {
    const company = a.companies as unknown as { name: string; official_name: string; status: string } | null;
    if (company) {
      results.set(company.name, { name: company.name, official_name: company.official_name || company.name, status: company.status || 'verified' });
    }
  }

  return Array.from(results.values()).slice(0, 10);
}

// 외부 검색 (공공데이터 - 국세청 사업자등록 API 대체로 simple search)
async function searchExternal(q: string): Promise<string[]> {
  // 한국 공공데이터 API 또는 무료 소스
  // 현재는 빈 배열 반환 (추후 공공데이터 API 연동 가능)
  // 예: data.go.kr 사업자등록정보 API
  try {
    // 무료 외부 소스가 없으면 graceful하게 빈 배열 반환
    return [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ internal: [], external: [], source: 'none' });
  }

  // 1. 내부 DB 검색
  const internal = await searchInternal(q);

  if (internal.length > 0) {
    return NextResponse.json({
      results: internal.map((c) => c.official_name || c.name),
      internal: internal.map((c) => ({ name: c.official_name || c.name, status: c.status })),
      external: [],
      source: 'internal',
    });
  }

  // 2. 내부 결과 없으면 외부 검색
  const external = await searchExternal(q);

  return NextResponse.json({
    results: external,
    internal: [],
    external,
    source: external.length > 0 ? 'external' : 'none',
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

  // 중복 체크
  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', normalized)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, name: existing.name, status: 'existing' });
  }

  // 새 회사 등록 (unverified)
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: normalized,
      official_name: name.trim(),
      status: 'unverified',
    })
    .select('id, name')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id, name: data?.name, status: 'created' });
}
