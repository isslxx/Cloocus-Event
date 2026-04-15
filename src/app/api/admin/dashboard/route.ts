import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const filter = req.nextUrl.searchParams.get('filter') || 'all';

  // 기본 쿼리: 삭제되지 않은 등록만
  let query = supabase
    .from('event_registrations')
    .select('created_at, industry, referral_source, event_id')
    .is('deleted_at', null);

  // 이벤트 유형별 필터 시 이벤트 목록 먼저 조회
  if (filter === 'online' || filter === 'offline') {
    const { data: filteredEvents } = await supabase
      .from('events')
      .select('id')
      .eq('event_type', filter);
    const ids = (filteredEvents || []).map((e) => e.id);
    if (ids.length === 0) {
      return NextResponse.json({ total: 0, today: 0, topIndustry: '-', topSource: '-', byDay: [], byIndustry: [], bySource: [], byEvent: [] });
    }
    query = query.in('event_id', ids);
  } else if (filter !== 'all') {
    query = query.eq('event_id', filter);
  }

  const [{ data: records }, { data: events }] = await Promise.all([
    query,
    supabase.from('events').select('id, name').order('event_date', { ascending: false }),
  ]);

  if (!records) {
    return NextResponse.json({ total: 0, today: 0, topIndustry: '-', topSource: '-', byDay: [], byIndustry: [], bySource: [], byEvent: [] });
  }

  const eventMap = new Map((events || []).map((e) => [e.id, e.name]));
  const today = new Date().toISOString().slice(0, 10);

  let todayCount = 0;
  const dayMap: Record<string, number> = {};
  const indMap: Record<string, number> = {};
  const srcMap: Record<string, number> = {};
  const evtMap: Record<string, number> = {};

  for (const r of records) {
    const d = r.created_at.slice(0, 10);
    if (d === today) todayCount++;
    dayMap[d] = (dayMap[d] || 0) + 1;
    indMap[r.industry] = (indMap[r.industry] || 0) + 1;
    srcMap[r.referral_source] = (srcMap[r.referral_source] || 0) + 1;
    const evtName = r.event_id ? (eventMap.get(r.event_id) || '기타') : '미지정';
    evtMap[evtName] = (evtMap[evtName] || 0) + 1;
  }

  const byDay = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));
  const byIndustry = Object.entries(indMap).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  const bySource = Object.entries(srcMap).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  const byEvent = Object.entries(evtMap).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

  return NextResponse.json({
    total: records.length,
    today: todayCount,
    topIndustry: byIndustry[0]?.name || '-',
    topSource: bySource[0]?.name || '-',
    byDay,
    byIndustry,
    bySource,
    byEvent,
  });
}
