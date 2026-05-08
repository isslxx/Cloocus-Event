import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import { baseSlugFromDate, pickAvailableSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, event_date, event_type, status, location, event_time, visible, capacity, privacy_category, category, ended_at, promo_url, summary, event_date_end } = await req.json();

  if (!name?.trim() || !event_date || !event_type) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // event_date 기준 YYYYMMDD slug 자동 생성. 동일 base 가 있으면 -2, -3 …
  const base = baseSlugFromDate(event_date);
  const { data: collisions } = await supabase
    .from('events')
    .select('slug')
    .or(`slug.eq.${base},slug.like.${base}-%`);
  const taken = new Set<string>((collisions || []).map((r) => r.slug).filter(Boolean) as string[]);
  const slug = pickAvailableSlug(base, taken);

  const { error } = await supabase.from('events').insert({
    name: name.trim(),
    slug,
    event_date,
    event_type,
    status: status || 'open',
    location: location?.trim() || '',
    event_time: event_time?.trim() || '',
    visible: visible !== false,
    capacity: capacity || null,
    privacy_category: privacy_category || '기타',
    category: category || '이벤트',
    ended_at: ended_at || null,
    // 프로모션 카테고리에서만 URL 의미가 있지만, 다른 카테고리도 미리 저장해두는 건 무해.
    promo_url: typeof promo_url === 'string' ? (promo_url.trim() || null) : null,
    summary: typeof summary === 'string' ? (summary.trim().slice(0, 280) || null) : null,
    event_date_end: typeof event_date_end === 'string' && event_date_end ? event_date_end : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug });
}
