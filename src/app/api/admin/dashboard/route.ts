import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import { toChartLabel } from '@/lib/industry-groups';

type Row = {
  created_at: string;
  industry: string | null;
  referral_source: string | null;
  referrer_name: string | null;
  event_id: string | null;
  survey_completed: boolean | null;
  certificate_issued: boolean | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type CountEntry = { name: string; value: number };
type DayEntry = { date: string; count: number };

function toKSTDateStr(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function offsetKSTDate(days: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + days);
  return kst.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDaysInclusive(startStr: string, endStr: string): number {
  const s = new Date(startStr + 'T00:00:00Z').getTime();
  const e = new Date(endStr + 'T00:00:00Z').getTime();
  return Math.floor((e - s) / 86400000) + 1;
}

function sortTopN<T extends { value: number }>(arr: T[], n = 10): T[] {
  return [...arr].sort((a, b) => b.value - a.value).slice(0, n);
}

type Window = { start: string | null; end: string | null };

type Aggregate = {
  total: number;                // 기간 무관 전체 (primary only)
  windowTotal: number;          // window 내 건수
  today: number;                // KST 오늘
  yesterday: number;            // KST 어제
  todayDeltaPct: number;
  topSource: string;
  topReferrer: { name: string; value: number };
  surveyCompletionRate: number;
  certificateRate: number;
  funnel: { registered: number; surveyCompleted: number; certificateIssued: number };
  byDay: DayEntry[];
  byIndustryChart: CountEntry[];
  byIndustryDetail: { industry: string; chartLabel: string; value: number }[];
  bySource: CountEntry[];
  byEvent: {
    name: string; total: number; surveyCompleted: number; certificateIssued: number; surveyRate: number;
  }[];
  topReferrers: CountEntry[];
  byUtm: { bySource: CountEntry[]; byMedium: CountEntry[]; byCampaign: CountEntry[] };
};

function aggregate(records: Row[], eventMap: Map<string, string>, win: Window): Aggregate {
  const today = todayKST();
  const yesterday = offsetKSTDate(-1);

  let todayCount = 0;
  let yesterdayCount = 0;
  let windowTotal = 0;
  let funnelSurvey = 0;
  let funnelCert = 0;

  const dayMap: Record<string, number> = {};
  const indDetailMap: Record<string, { chartLabel: string; value: number }> = {};
  const indChartMap: Record<string, number> = {};
  const srcMap: Record<string, number> = {};
  const evtAgg: Record<string, { total: number; surveyCompleted: number; certificateIssued: number }> = {};
  const referrerMap: Record<string, number> = {};
  const utmSourceMap: Record<string, number> = {};
  const utmMediumMap: Record<string, number> = {};
  const utmCampaignMap: Record<string, number> = {};

  for (const r of records) {
    const dateKST = toKSTDateStr(r.created_at);
    const inWindow = !win.start || !win.end || (dateKST >= win.start && dateKST <= win.end);

    if (dateKST === today) todayCount++;
    if (dateKST === yesterday) yesterdayCount++;

    if (inWindow) {
      windowTotal++;
      dayMap[dateKST] = (dayMap[dateKST] || 0) + 1;

      // window 내부만 aggregation 집계
      const industry = r.industry || '미지정';
      const chartLabel = toChartLabel(r.industry);
      if (!indDetailMap[industry]) indDetailMap[industry] = { chartLabel, value: 0 };
      indDetailMap[industry].value++;
      indChartMap[chartLabel] = (indChartMap[chartLabel] || 0) + 1;

      const src = r.referral_source || '미지정';
      srcMap[src] = (srcMap[src] || 0) + 1;

      const evtKey = r.event_id ? (eventMap.get(r.event_id) || '기타') : '미지정';
      if (!evtAgg[evtKey]) evtAgg[evtKey] = { total: 0, surveyCompleted: 0, certificateIssued: 0 };
      evtAgg[evtKey].total++;
      if (r.survey_completed) { evtAgg[evtKey].surveyCompleted++; funnelSurvey++; }
      if (r.certificate_issued) { evtAgg[evtKey].certificateIssued++; funnelCert++; }

      if (r.referrer_name && r.referrer_name.trim()) {
        const key = r.referrer_name.trim();
        referrerMap[key] = (referrerMap[key] || 0) + 1;
      }

      if (r.utm_source)   utmSourceMap[r.utm_source]     = (utmSourceMap[r.utm_source] || 0) + 1;
      if (r.utm_medium)   utmMediumMap[r.utm_medium]     = (utmMediumMap[r.utm_medium] || 0) + 1;
      if (r.utm_campaign) utmCampaignMap[r.utm_campaign] = (utmCampaignMap[r.utm_campaign] || 0) + 1;
    }
  }

  // 일별 — window 내 연속 날짜 (0건 포함)
  const byDay: DayEntry[] = [];
  if (win.start && win.end) {
    const startMs = new Date(win.start + 'T00:00:00Z').getTime();
    const endMs = new Date(win.end + 'T00:00:00Z').getTime();
    for (let t = startMs; t <= endMs; t += 86400000) {
      const key = new Date(t).toISOString().slice(0, 10);
      byDay.push({ date: key.slice(5), count: dayMap[key] || 0 });
    }
  } else {
    Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => byDay.push({ date: date.slice(5), count }));
  }

  const byIndustryChart: CountEntry[] = Object.entries(indChartMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byIndustryDetail = Object.entries(indDetailMap)
    .map(([industry, v]) => ({ industry, chartLabel: v.chartLabel, value: v.value }))
    .sort((a, b) => b.value - a.value);

  const bySource: CountEntry[] = Object.entries(srcMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byEvent = Object.entries(evtAgg)
    .map(([name, v]) => ({
      name,
      total: v.total,
      surveyCompleted: v.surveyCompleted,
      certificateIssued: v.certificateIssued,
      surveyRate: v.total > 0 ? v.surveyCompleted / v.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topReferrers = sortTopN(
    Object.entries(referrerMap).map(([name, value]) => ({ name, value })),
    10
  );

  const byUtmSource   = sortTopN(Object.entries(utmSourceMap).map(([name, value]) => ({ name, value })), 10);
  const byUtmMedium   = sortTopN(Object.entries(utmMediumMap).map(([name, value]) => ({ name, value })), 10);
  const byUtmCampaign = sortTopN(Object.entries(utmCampaignMap).map(([name, value]) => ({ name, value })), 10);

  const todayDeltaPct = yesterdayCount > 0
    ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
    : todayCount > 0 ? 100 : 0;

  const surveyCompletionRate = windowTotal > 0 ? funnelSurvey / windowTotal : 0;
  const certificateRate = windowTotal > 0 ? funnelCert / windowTotal : 0;

  return {
    total: records.length,
    windowTotal,
    today: todayCount,
    yesterday: yesterdayCount,
    todayDeltaPct,
    topSource: bySource[0]?.name || '-',
    topReferrer: topReferrers[0] || { name: '-', value: 0 },
    surveyCompletionRate,
    certificateRate,
    funnel: { registered: windowTotal, surveyCompleted: funnelSurvey, certificateIssued: funnelCert },
    byDay,
    byIndustryChart,
    byIndustryDetail,
    bySource,
    byEvent,
    topReferrers,
    byUtm: { bySource: byUtmSource, byMedium: byUtmMedium, byCampaign: byUtmCampaign },
  };
}

async function fetchRecords(
  supabase: ReturnType<typeof getServiceSupabase>,
  eventIds: string[] | null
): Promise<Row[]> {
  let q = supabase
    .from('event_registrations')
    .select('created_at, industry, referral_source, referrer_name, event_id, survey_completed, certificate_issued, utm_source, utm_medium, utm_campaign')
    .is('deleted_at', null);
  if (eventIds) q = q.in('event_id', eventIds);
  const { data } = await q;
  return (data as Row[]) || [];
}

type VisitUtmAggregate = {
  totalVisits: number;
  uniqueSessions: number;
  bySource:   CountEntry[];
  byMedium:   CountEntry[];
  byCampaign: CountEntry[];
};

// page_events에서 UTM이 붙은 트래픽 집계 (방문 기준 - 등록과는 별개로 캠페인 도달 측정)
async function fetchVisitUtm(
  supabase: ReturnType<typeof getServiceSupabase>,
  win: Window,
  eventIds: string[] | null
): Promise<VisitUtmAggregate> {
  let q = supabase
    .from('page_events')
    .select('session_id, utm_source, utm_medium, utm_campaign, created_at, event_id')
    .not('utm_source', 'is', null);

  if (win.start) q = q.gte('created_at', `${win.start}T00:00:00+09:00`);
  if (win.end)   q = q.lte('created_at', `${win.end}T23:59:59+09:00`);
  if (eventIds && eventIds.length > 0) {
    // page_events에는 event_id가 있을 수도 없을 수도 있어 → IN 필터 시 NULL은 자동 제외 (이벤트 필터 적용 시 의도한 동작)
    q = q.in('event_id', eventIds);
  }

  const { data } = await q.range(0, 49999);
  const rows = (data as { session_id: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }[]) || [];

  const sourceMap: Record<string, number> = {};
  const mediumMap: Record<string, number> = {};
  const campaignMap: Record<string, number> = {};
  const sessions = new Set<string>();

  for (const r of rows) {
    if (r.session_id) sessions.add(r.session_id);
    if (r.utm_source)   sourceMap[r.utm_source]     = (sourceMap[r.utm_source] || 0) + 1;
    if (r.utm_medium)   mediumMap[r.utm_medium]     = (mediumMap[r.utm_medium] || 0) + 1;
    if (r.utm_campaign) campaignMap[r.utm_campaign] = (campaignMap[r.utm_campaign] || 0) + 1;
  }

  return {
    totalVisits: rows.length,
    uniqueSessions: sessions.size,
    bySource:   sortTopN(Object.entries(sourceMap).map(([name, value])   => ({ name, value })), 10),
    byMedium:   sortTopN(Object.entries(mediumMap).map(([name, value])   => ({ name, value })), 10),
    byCampaign: sortTopN(Object.entries(campaignMap).map(([name, value]) => ({ name, value })), 10),
  };
}

async function resolveEventIds(
  supabase: ReturnType<typeof getServiceSupabase>,
  filter: string
): Promise<string[] | null | 'empty'> {
  if (filter === 'all') return null;
  if (filter === 'online' || filter === 'offline') {
    const { data } = await supabase.from('events').select('id').eq('event_type', filter);
    const ids = (data || []).map((e) => e.id);
    return ids.length === 0 ? 'empty' : ids;
  }
  return [filter];
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const filter = req.nextUrl.searchParams.get('filter') || 'all';
  const rangeParam = req.nextUrl.searchParams.get('range') || '30';
  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');
  const compare = req.nextUrl.searchParams.get('compare') || 'off'; // off | prev | event
  const compareEventId = req.nextUrl.searchParams.get('compareEventId');

  // Primary 기간 확정
  const today = todayKST();
  const rangeDays = rangeParam === '7' || rangeParam === '14' || rangeParam === '30'
    ? parseInt(rangeParam, 10) : null;
  const primaryStart = rangeDays ? offsetKSTDate(-(rangeDays - 1)) : (startParam || null);
  const primaryEnd = rangeDays ? today : (endParam || null);
  const primaryWin: Window = { start: primaryStart, end: primaryEnd };

  // Primary 이벤트 필터
  const eventIds = await resolveEventIds(supabase, filter);
  if (eventIds === 'empty') return NextResponse.json(emptyResponse());

  // Records fetch (primary) + page_events UTM (방문 기준)
  const [primaryRecords, { data: events }, primaryVisitUtm] = await Promise.all([
    fetchRecords(supabase, eventIds as string[] | null),
    supabase.from('events').select('id, name').order('event_date', { ascending: false }),
    fetchVisitUtm(supabase, primaryWin, eventIds as string[] | null),
  ]);
  const eventMap = new Map((events || []).map((e) => [e.id as string, e.name as string]));

  const primary = aggregate(primaryRecords, eventMap, primaryWin);

  // Compare 처리
  let compareBlock: null | {
    mode: 'prev' | 'event';
    label: string;
    range: Window;
    agg: Aggregate;
  } = null;

  if (compare === 'prev' && primaryStart && primaryEnd) {
    const days = diffDaysInclusive(primaryStart, primaryEnd);
    const prevEnd = addDays(primaryStart, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    const prevWin: Window = { start: prevStart, end: prevEnd };
    const prevAgg = aggregate(primaryRecords, eventMap, prevWin);
    compareBlock = {
      mode: 'prev',
      label: `전기간 (${prevStart} ~ ${prevEnd})`,
      range: prevWin,
      agg: prevAgg,
    };
  } else if (compare === 'event' && compareEventId) {
    const cmpRecords = await fetchRecords(supabase, [compareEventId]);
    const cmpAgg = aggregate(cmpRecords, eventMap, primaryWin);
    const cmpName = eventMap.get(compareEventId) || compareEventId;
    compareBlock = {
      mode: 'event',
      label: cmpName,
      range: primaryWin,
      agg: cmpAgg,
    };
  }

  return NextResponse.json({
    filter,
    range: { start: primaryStart, end: primaryEnd, days: rangeDays },
    compareMode: compareBlock?.mode || 'off',
    compareLabel: compareBlock?.label || null,

    kpi: {
      total: primary.total,
      today: primary.today,
      yesterdayCount: primary.yesterday,
      todayDeltaPct: primary.todayDeltaPct,
      topIndustryGroup: primary.byIndustryChart[0]?.name || '-',
      topSource: primary.topSource,
      topReferrer: primary.topReferrer,
      surveyCompletionRate: primary.surveyCompletionRate,
      certificateRate: primary.certificateRate,
      windowTotal: primary.windowTotal,
    },

    funnel: primary.funnel,
    byDay: primary.byDay,
    byIndustryGroup: primary.byIndustryChart,
    byIndustryDetail: primary.byIndustryDetail,
    bySource: primary.bySource,
    byEvent: primary.byEvent,
    topReferrers: primary.topReferrers,
    byUtm: primary.byUtm,
    visitUtm: primaryVisitUtm,

    // 비교 데이터 (optional)
    compare: compareBlock ? {
      mode: compareBlock.mode,
      label: compareBlock.label,
      range: compareBlock.range,
      windowTotal: compareBlock.agg.windowTotal,
      funnel: compareBlock.agg.funnel,
      byDay: compareBlock.agg.byDay,
      byIndustryGroup: compareBlock.agg.byIndustryChart,
      bySource: compareBlock.agg.bySource,
      byUtm: compareBlock.agg.byUtm,
      surveyCompletionRate: compareBlock.agg.surveyCompletionRate,
    } : null,

    // 레거시 호환
    total: primary.total,
    today: primary.today,
    topIndustry: primary.byIndustryChart[0]?.name || '-',
    byIndustry: primary.byIndustryChart,
  });
}

function emptyResponse() {
  return {
    filter: 'all',
    range: { start: null, end: null, days: null },
    compareMode: 'off',
    compareLabel: null,
    kpi: {
      total: 0, today: 0, yesterdayCount: 0, todayDeltaPct: 0,
      topIndustryGroup: '-', topSource: '-',
      topReferrer: { name: '-', value: 0 },
      surveyCompletionRate: 0, certificateRate: 0,
      windowTotal: 0,
    },
    funnel: { registered: 0, surveyCompleted: 0, certificateIssued: 0 },
    byDay: [], byIndustryGroup: [], byIndustryDetail: [],
    bySource: [], byEvent: [], topReferrers: [],
    byUtm: { bySource: [], byMedium: [], byCampaign: [] },
    visitUtm: { totalVisits: 0, uniqueSessions: 0, bySource: [], byMedium: [], byCampaign: [] },
    compare: null,
    total: 0, today: 0, topIndustry: '-', byIndustry: [],
  };
}
